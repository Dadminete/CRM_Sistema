import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cajas, sesionesCaja, movimientosContables, categoriasCuentas } from "@/lib/db/schema";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { subDays, startOfDay, format } from "date-fns";

export async function GET() {
  try {
    const today = startOfDay(new Date());
    const sevenDaysAgo = subDays(today, 7);

    // 1. Overview Metrics
    const [totalBalanceResult, dailyStats] = await Promise.all([
      db
        .select({ total: sql<string>`COALESCE(SUM(saldo_actual), 0)` })
        .from(cajas)
        .where(eq(cajas.activa, true)),
      db
        .select({
          ingresosHoy: sql<string>`COALESCE(SUM(CASE WHEN tipo = 'ingreso' AND fecha >= ${today.toISOString()} THEN monto ELSE 0 END), 0)`,
          gastosHoy: sql<string>`COALESCE(SUM(CASE WHEN tipo = 'gasto' AND fecha >= ${today.toISOString()} THEN monto ELSE 0 END), 0)`,
          sesionesHoy: sql<number>`COUNT(DISTINCT CASE WHEN created_at >= ${today.toISOString()} THEN id ELSE NULL END)`,
        })
        .from(movimientosContables), // Note: using movimientos for today stats, but sesiones for count
    ]);

    const totalSessionsHoy = await db
      .select({ count: sql<number>`count(*)` })
      .from(sesionesCaja)
      .where(gte(sesionesCaja.createdAt, today.toISOString()));

    // 2. Historical Trend (Last 7 Days)
    const historyData = await db.execute(sql`
            SELECT 
                TO_CHAR(fecha, 'DD-MM') as date,
                SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as ingresos,
                SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END) as gastos
            FROM movimientos_contables
            WHERE fecha >= ${sevenDaysAgo.toISOString()}
            GROUP BY TO_CHAR(fecha, 'DD-MM'), DATE_TRUNC('day', fecha)
            ORDER BY DATE_TRUNC('day', fecha) ASC
        `);

    // 3. Income by Source (Category)
    const incomeBySource = await db
      .select({
        source: categoriasCuentas.nombre,
        value: sql<number>`SUM(movimientos_contables.monto)`,
      })
      .from(movimientosContables)
      .innerJoin(categoriasCuentas, eq(movimientosContables.categoriaId, categoriasCuentas.id))
      .where(and(eq(movimientosContables.tipo, "ingreso"), gte(movimientosContables.fecha, sevenDaysAgo.toISOString())))
      .groupBy(categoriasCuentas.nombre);

    // 4. Balances by Box
    const boxesBalance = await db
      .select({
        name: cajas.nombre,
        balance: cajas.saldoActual,
        type: cajas.tipo,
      })
      .from(cajas)
      .where(eq(cajas.activa, true))
      .orderBy(desc(cajas.saldoActual));

    // 5. Recent Movements
    const recentMovements = await db
      .select({
        id: movimientosContables.id,
        tipo: movimientosContables.tipo,
        monto: movimientosContables.monto,
        descripcion: movimientosContables.descripcion,
        fecha: movimientosContables.fecha,
        metodo: movimientosContables.metodo,
      })
      .from(movimientosContables)
      .orderBy(desc(movimientosContables.fecha))
      .limit(10);

    // 6. Check for discrepancies (closed sessions with difference)
    const discrepanciesResult = await db.execute(sql`
            SELECT COUNT(*) 
            FROM (
                SELECT 
                    s.id,
                    CAST(s.monto_apertura AS NUMERIC) as apertura,
                    CAST(s.monto_cierre AS NUMERIC) as cierre,
                    COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN CAST(m.monto AS NUMERIC) ELSE 0 END), 0) as ingresos,
                    COALESCE(SUM(CASE WHEN m.tipo = 'gasto' THEN CAST(m.monto AS NUMERIC) ELSE 0 END), 0) as gastos
                FROM sesiones_caja s
                LEFT JOIN movimientos_contables m ON m.caja_id = s.caja_id 
                    AND m.fecha >= s.fecha_apertura 
                    AND m.fecha <= s.fecha_cierre
                WHERE s.estado = 'cerrada' AND s.monto_cierre IS NOT NULL
                GROUP BY s.id, s.monto_apertura, s.monto_cierre
            ) as session_totals
            WHERE ABS((apertura + ingresos - gastos) - cierre) > 0.01
        `);

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalBalance: totalBalanceResult[0].total,
          ingresosHoy: dailyStats[0].ingresosHoy,
          gastosHoy: dailyStats[0].gastosHoy,
          sesionesHoy: totalSessionsHoy[0].count,
          discrepancias: parseInt((discrepanciesResult.rows[0] as any).count || "0"),
        },
        history: historyData.rows || historyData,
        distribution: incomeBySource,
        boxes: boxesBalance,
        recent: recentMovements,
      },
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
