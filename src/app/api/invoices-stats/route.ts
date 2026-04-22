import { NextResponse } from "next/server";
import { eq, gte, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { cuentasPorCobrar, facturasClientes, pagosClientes } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Obtener saldos usando un JOIN para filtrar por el estado de la FACTURA
    // El estado en facturas_clientes es más preciso ('parcial', 'pago parcial', 'pendiente')
    // El monto_pendiente en cuentas_por_cobrar es el valor real a pagar
    const balances = await db
      .select({
        facturaEstado: facturasClientes.estado,
        montoPendiente: cuentasPorCobrar.montoPendiente,
      })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .where(
        or(
          eq(facturasClientes.estado, "pendiente"),
          eq(facturasClientes.estado, "parcial"),
          eq(facturasClientes.estado, "pago parcial"),
          eq(facturasClientes.estado, "adelantado"),
          eq(facturasClientes.estado, "pago adelantado"),
        ),
      );

    let totalPendiente = 0;
    let totalParcial = 0;

    balances.forEach((b) => {
      const monto = Number(b.montoPendiente || 0);
      const estado = b.facturaEstado?.toLowerCase() || "";

      // El total pendiente PRINCIPAL es la suma de TODO lo que se debe
      totalPendiente += monto;

      // Mantener totalParcial por separado para el desglose visual (opcional si se usa en la UI)
      if (estado === "parcial" || estado === "pago parcial" || estado === "adelantado" || estado === "pago adelantado") {
        totalParcial += monto;
      }
    });

    // 2. Obtener datos para la gráfica: Ingresos por pagos de facturas del mes actual
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];

    const dailyIncome = await db
      .select({
        date: sql<string>`DATE(${pagosClientes.fechaPago})`,
        total: sql<number>`SUM(CAST(${pagosClientes.monto} AS DECIMAL))`,
      })
      .from(pagosClientes)
      .where(gte(pagosClientes.fechaPago, firstDayOfMonth))
      .groupBy(sql`DATE(${pagosClientes.fechaPago})`)
      .orderBy(sql`DATE(${pagosClientes.fechaPago})`);

    const stats = dailyIncome.map((row) => ({
      fecha: row.date,
      ingresos: Number(row.total || 0),
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalPendiente,
        totalParcial,
        stats,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching invoice stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: message,
        data: { totalPendiente: 0, totalParcial: 0, stats: [] },
      },
      { status: 200 },
    );
  }
}
