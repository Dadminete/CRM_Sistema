import { db } from "@/lib/db";
import {
  pagosCuentasPorPagar,
  cuentasPorPagar,
  proveedores,
  pagosPagosFijos,
  pagosFijos,
  movimientosContables,
} from "@/lib/db/schema";
import { desc, eq, and, sql, isNull, gte } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    // Optional date filtering
    // const startDate = searchParams.get("startDate");
    // const endDate = searchParams.get("endDate");

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
      .where(and(eq(movimientosContables.tipo, "gasto"), isNull(movimientosContables.cuentaPorPagarId)));

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

    // Sort by Date Descending
    normalizedExpenses.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // Calculate Daily Stats for Chart (Current Month)
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Helper to check if date is in current month
    const isCurrentMonth = (d: Date | string) => {
      const dateObj = new Date(d);
      return dateObj >= firstDayOfMonth && dateObj <= today;
    };

    const dailyMap = new Map<string, number>();

    normalizedExpenses.forEach((exp) => {
      if (isCurrentMonth(exp.fecha)) {
        const day = new Date(exp.fecha).toISOString().split("T")[0];
        const current = dailyMap.get(day) || 0;
        dailyMap.set(day, current + exp.monto);
      }
    });

    const dailyStats = Array.from(dailyMap.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Summary Stats (Current Month Only)
    // normalizedExpenses `fecha` is already a Date object or string.
    // We need to be careful with types here. normalizedExpenses definition above maps p.fecha.
    // p.fecha from table is Date usually. But generalExpenses maps `new Date(p.fecha)`.
    // Let's ensure standard comparison.

    const currentMonthExpenses = normalizedExpenses.filter((exp) => {
      const d = new Date(exp.fecha);
      return d >= firstDayOfMonth && d <= today;
    });

    const totalAmount = currentMonthExpenses.reduce((sum, item) => sum + item.monto, 0);
    const count = currentMonthExpenses.length;
    const average = count > 0 ? totalAmount / count : 0;

    return NextResponse.json({
      success: true,
      data: normalizedExpenses,
      dailyStats,
      summary: {
        total: totalAmount,
        count,
        average,
      },
    });
  } catch (error: any) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
