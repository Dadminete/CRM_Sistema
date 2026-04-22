import { NextResponse } from "next/server";

import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { banks, cuentasBancarias, cuentasContables, movimientosContables } from "@/lib/db/schema";

// Forzar que el endpoint sea dinámico y no se cachee
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Obtener el saldo total de todas las cuentas bancarias activas en una sola consulta
    // Saldo = SaldoInicial (libro mayor) + Sum(Ingresos) - Sum(Gastos)
    const accountStats = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CAST(cc.saldo_inicial AS DECIMAL)), 0) as total_inicial,
        COALESCE(SUM(CASE WHEN mc.tipo = 'ingreso' THEN CAST(mc.monto AS DECIMAL) ELSE 0 END), 0) as total_ingresos,
        COALESCE(SUM(CASE WHEN mc.tipo = 'gasto' THEN CAST(mc.monto AS DECIMAL) ELSE 0 END), 0) as total_gastos
      FROM cuentas_bancarias cb
      JOIN cuentas_contables cc ON cb.cuenta_contable_id = cc.id
      LEFT JOIN movimientos_contables mc ON mc.cuenta_bancaria_id = cb.id
      WHERE cb.activo = true
    `);

    const stats = (accountStats.rows[0] as any) || { total_inicial: 0, total_ingresos: 0, total_gastos: 0 };
    const saldoTotal = Number(stats.total_inicial) + Number(stats.total_ingresos) - Number(stats.total_gastos);

    // 2. Obtener datos de los últimos 6 meses en una sola consulta
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyStatsRaw = await db.execute(sql`
      SELECT 
        DATE_TRUNC('month', fecha)::date as mes_fecha,
        COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN CAST(monto AS DECIMAL) ELSE 0 END), 0) as ingresos,
        COALESCE(SUM(CASE WHEN tipo = 'gasto' THEN CAST(monto AS DECIMAL) ELSE 0 END), 0) as gastos
      FROM movimientos_contables
      WHERE cuenta_bancaria_id IS NOT NULL
        AND fecha >= ${sixMonthsAgo.toISOString()}
      GROUP BY DATE_TRUNC('month', fecha)
      ORDER BY DATE_TRUNC('month', fecha) ASC
    `);

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const ultimosMeses = [];
    let currentBalanceAccumulator = saldoTotal;

    // Convertimos a array para procesar hacia atrás el balance si es necesario, 
    // pero aquí los tenemos en orden ascendente para el acumulador invertido
    const rows = monthlyStatsRaw.rows as any[];
    
    // Mapeamos los meses que tenemos datos
    const historyMap = new Map();
    rows.forEach(row => {
      const date = new Date(row.mes_fecha);
      historyMap.set(date.getMonth() + "-" + date.getFullYear(), {
        ingresos: Number(row.ingresos),
        gastos: Number(row.gastos)
      });
    });

    // Generamos exactamente 6 meses
    const now = new Date();
    const monthsToProcess = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthsToProcess.push(d);
    }

    // Procesamos para calcular los balances históricos
    for (const d of monthsToProcess) {
      const key = d.getMonth() + "-" + d.getFullYear();
      const stat = historyMap.get(key) || { ingresos: 0, gastos: 0 };
      
      ultimosMeses.unshift({
        mes: monthNames[d.getMonth()],
        ingresos: stat.ingresos,
        gastos: stat.gastos,
        balance: Number(currentBalanceAccumulator.toFixed(2)),
      });

      // El balance del mes anterior es BalanceActual - (IngresosMesActual - GastosMesActual)
      currentBalanceAccumulator -= (stat.ingresos - stat.gastos);
    }


    return NextResponse.json({
      success: true,
      data: {
        saldoTotal,
        ultimosMeses,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching bank stats:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
