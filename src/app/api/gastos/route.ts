import { db } from "@/lib/db";
import {
  pagosCuentasPorPagar,
  cuentasPorPagar,
  proveedores,
  pagosPagosFijos,
  pagosFijos,
  movimientosContables,
  categoriasCuentas,
} from "@/lib/db/schema";
import { desc, eq, and, sql, isNull, gte, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    // Optional date filtering
    // const startDate = searchParams.get("startDate");
    // const endDate = searchParams.get("endDate");

    const traspasoCat = await db
      .select({ id: categoriasCuentas.id })
      .from(categoriasCuentas)
      .where(eq(categoriasCuentas.codigo, "TRASP-001"))
      .limit(1);
    const traspasoCatId = traspasoCat[0]?.id ?? null;

    // 1. Fetch Supplier Payments (Pagos a Proveedores)
    const supplierPaymentsPromise = db
      .select({
        id: pagosCuentasPorPagar.id,
        monto: pagosCuentasPorPagar.monto,
        fecha: pagosCuentasPorPagar.fechaPago,
        metodoPago: pagosCuentasPorPagar.metodoPago,
        referencia: pagosCuentasPorPagar.numeroReferencia,
        observaciones: pagosCuentasPorPagar.observaciones,
        proveedorNombre: proveedores.nombre,
        concepto: cuentasPorPagar.concepto,
      })
      .from(pagosCuentasPorPagar)
      .leftJoin(cuentasPorPagar, eq(pagosCuentasPorPagar.cuentaPorPagarId, cuentasPorPagar.id))
      .leftJoin(proveedores, eq(cuentasPorPagar.proveedorId, proveedores.id));

    // 2. Fetch Fixed Payments (Pagos Fijos)
    const fixedPaymentsPromise = db
      .select({
        id: pagosPagosFijos.id,
        monto: pagosPagosFijos.montoPagado,
        fecha: pagosPagosFijos.fechaPago,
        metodoPago: pagosPagosFijos.metodoPago,
        referencia: pagosPagosFijos.numeroReferencia,
        observaciones: pagosPagosFijos.observaciones,
        nombreFijo: pagosFijos.nombre,
        descripcionFijo: pagosFijos.descripcion,
      })
      .from(pagosPagosFijos)
      .leftJoin(pagosFijos, eq(pagosPagosFijos.pagoFijoId, pagosFijos.id));

    // 3. Fetch General Accounting Expenses (Gastos Generales)
    // Exclude those that might be linked to AP (though schema link is on the movement table, we filter for NULL to be safe/distinct if used that way)
    const generalExpensesPromise = db
      .select({
        id: movimientosContables.id,
        monto: movimientosContables.monto,
        fecha: movimientosContables.fecha,
        metodoPago: movimientosContables.metodo,
        descripcion: movimientosContables.descripcion,
        tipo: movimientosContables.tipo,
        cuentaPorPagarId: movimientosContables.cuentaPorPagarId,
      })
      .from(movimientosContables)
      .where(
        traspasoCatId
          ? and(
              eq(movimientosContables.tipo, "gasto"),
              isNull(movimientosContables.cuentaPorPagarId),
              ne(movimientosContables.categoriaId, traspasoCatId),
            )
          : and(eq(movimientosContables.tipo, "gasto"), isNull(movimientosContables.cuentaPorPagarId)),
      );

    const [supplierPayments, fixedPayments, generalExpenses] = await Promise.all([
      supplierPaymentsPromise,
      fixedPaymentsPromise,
      generalExpensesPromise,
    ]);

    // Normalize Data
    const normalizedExpenses = [
      ...supplierPayments.map((p: any) => ({
        id: p.id,
        fecha: p.fecha,
        monto: parseFloat(p.monto),
        beneficiario: p.proveedorNombre || "Proveedor Desconocido",
        concepto: p.concepto || "Pago a proveedor",
        tipo: "PROVEEDOR",
        metodoPago: p.metodoPago,
        referencia: p.referencia,
        detalles: p.observaciones,
      })),
      ...fixedPayments.map((p: any) => ({
        id: p.id,
        fecha: p.fecha,
        monto: parseFloat(p.monto),
        beneficiario: p.nombreFijo || "Pago Fijo",
        concepto: p.descripcionFijo || "Pago recurrente",
        tipo: "FIJO",
        metodoPago: p.metodoPago,
        referencia: p.referencia,
        detalles: p.observaciones,
      })),
      ...generalExpenses.map((p: any) => ({
        id: p.id,
        fecha: new Date(p.fecha), // timestamp string to date
        monto: parseFloat(p.monto),
        beneficiario: "Gasto General",
        concepto: p.descripcion || "Movimiento contable",
        tipo: "OTRO",
        metodoPago: p.metodoPago || "N/A",
        referencia: "-",
        detalles: "-",
      })),
    ];

    // Determine month bounds
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    lastDayOfMonth.setHours(23, 59, 59, 999);

    // Helper to safely parse dates and check month
    const parseSafeDate = (d: Date | string) => new Date(d instanceof Date ? d : (d + "T00:00:00Z"));
    
    // Filter to current month ONLY
    const monthlyExpenses = normalizedExpenses.filter((exp) => {
      const dateObj = parseSafeDate(exp.fecha);
      return dateObj >= firstDayOfMonth && dateObj <= lastDayOfMonth;
    });

    // Sort by Date Descending
    monthlyExpenses.sort((a, b) => parseSafeDate(b.fecha).getTime() - parseSafeDate(a.fecha).getTime());

    const dailyMap = new Map<string, number>();

    monthlyExpenses.forEach((exp) => {
      const dateObj = parseSafeDate(exp.fecha);
      const day = dateObj.toISOString().split("T")[0];
      const current = dailyMap.get(day) || 0;
      dailyMap.set(day, current + exp.monto);
    });

    const dailyStats = Array.from(dailyMap.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Summary Stats
    const totalAmount = monthlyExpenses.reduce((sum, item) => sum + item.monto, 0);
    const count = monthlyExpenses.length;
    const average = count > 0 ? totalAmount / count : 0;

    return NextResponse.json({
      success: true,
      data: monthlyExpenses.map((exp) => ({
        ...exp,
        fecha: parseSafeDate(exp.fecha).toLocaleDateString("es-DO"),
      })),
      dailyStats,
      summary: {
        total: Math.round(totalAmount * 100) / 100,
        count,
        average: Math.round(average * 100) / 100,
      },
    });
  } catch (error: any) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al cargar gastos" },
      { status: 500 },
    );
  }
}
