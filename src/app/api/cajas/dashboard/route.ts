import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cajas, sesionesCaja, movimientosContables, categoriasCuentas } from "@/lib/db/schema";
import { eq, and, sql, desc, gte, lte, ne } from "drizzle-orm";
import { subDays, startOfDay, startOfMonth } from "date-fns";

export async function GET() {
  try {
    const today = startOfDay(new Date());
    const sevenDaysAgo = subDays(today, 7);
    const monthStart = startOfMonth(today);
    const traspasoCat = await db
      .select({ id: categoriasCuentas.id })
      .from(categoriasCuentas)
      .where(eq(categoriasCuentas.codigo, "TRASP-001"))
      .limit(1);
    const traspasoCatId = traspasoCat[0]?.id ?? null;

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
        .from(movimientosContables)
        .where(
          and(
            sql`${movimientosContables.cajaId} IS NOT NULL`,
            traspasoCatId
              ? ne(movimientosContables.categoriaId, traspasoCatId)
              : sql`true`
          )
        ),
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
          AND caja_id IS NOT NULL
          ${traspasoCatId ? sql`AND categoria_id != ${traspasoCatId}` : sql``}
        GROUP BY TO_CHAR(fecha, 'DD-MM'), DATE_TRUNC('day', fecha)
        ORDER BY DATE_TRUNC('day', fecha) ASC
      `);

    // 3. Income by Source (real accounting category) — current month
    const incomeBySourceRaw = await db.execute(sql`
      SELECT 
        cc.nombre as source,
        SUM(CAST(mc.monto AS NUMERIC)) as value
      FROM movimientos_contables mc
      INNER JOIN categorias_cuentas cc ON cc.id = mc.categoria_id
      WHERE mc.tipo = 'ingreso'
        AND mc.fecha >= ${monthStart.toISOString()}
        AND mc.caja_id IS NOT NULL
        ${traspasoCatId ? sql`AND mc.categoria_id != ${traspasoCatId}` : sql``}
      GROUP BY cc.nombre
      ORDER BY value DESC
    `);

    const incomeBySource = incomeBySourceRaw.rows.map(row => ({
      source: row.source as string,
      value: Number(row.value)
    }));

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
      .where(
        and(
          sql`${movimientosContables.cajaId} IS NOT NULL`,
          traspasoCatId ? ne(movimientosContables.categoriaId, traspasoCatId) : sql`true`
        )
      )
      .orderBy(desc(movimientosContables.fecha))
      .limit(10);

    const recentTransfers = await db.execute(sql`
      SELECT 
        t.id,
        t.numero_traspaso AS "numero",
        t.concepto_traspaso AS "concepto",
        t.monto,
        t.fecha_traspaso AS "fecha",
        t.caja_origen_id AS "cajaOrigenId",
        t.caja_destino_id AS "cajaDestinoId",
        t.banco_origen_id AS "bancoOrigenId",
        t.banco_destino_id AS "bancoDestinoId",
        co.nombre AS "cajaOrigenNombre",
        cd.nombre AS "cajaDestinoNombre",
        bo.numero_cuenta AS "bancoOrigenNombre",
        bd.numero_cuenta AS "bancoDestinoNombre"
      FROM traspasos t
      LEFT JOIN cajas co ON co.id = t.caja_origen_id
      LEFT JOIN cajas cd ON cd.id = t.caja_destino_id
      LEFT JOIN cuentas_bancarias bo ON bo.id = t.banco_origen_id
      LEFT JOIN cuentas_bancarias bd ON bd.id = t.banco_destino_id
      ORDER BY t.fecha_traspaso DESC
      LIMIT 10
    `);

    // 6. Check for discrepancies (closed sessions with difference, excluding resolved ones)
    const discrepanciesResult = await db.execute(sql`
            SELECT COUNT(*) 
            FROM (
                SELECT 
                    s.id,
                    CAST(s.monto_apertura AS NUMERIC) as apertura,
                    CAST(s.monto_cierre AS NUMERIC) as cierre,
                    COALESCE(SUM(CASE WHEN m.tipo IN ('ingreso', 'traspaso') THEN CAST(m.monto AS NUMERIC) ELSE 0 END), 0) as ingresos,
                    COALESCE(SUM(CASE WHEN m.tipo IN ('gasto', 'egreso') THEN CAST(m.monto AS NUMERIC) ELSE 0 END), 0) as gastos
                FROM sesiones_caja s
                LEFT JOIN movimientos_contables m ON m.caja_id = s.caja_id 
                  AND m.fecha >= s.fecha_apertura 
                  AND m.fecha <= s.fecha_cierre
                WHERE s.estado = 'cerrada' 
                  AND s.monto_cierre IS NOT NULL
                  AND COALESCE(s.observaciones, '') NOT LIKE '%[RESOLUCIÓN%'
                  AND COALESCE(s.observaciones, '') NOT LIKE '%[FORZADO ADMIN]%'
                GROUP BY s.id, s.monto_apertura, s.monto_cierre
            ) as session_totals
            WHERE ABS((apertura + ingresos - gastos) - cierre) > 0.01
        `);

    // 7. Active sessions (open) for alerts
    const activeSessions = await db.execute(sql`
      SELECT 
        s.id,
        s.fecha_apertura AS "fechaApertura",
        s.monto_apertura AS "montoApertura",
        c.nombre AS "cajaNombre",
        u.nombre AS "usuarioNombre",
        u.apellido AS "usuarioApellido",
        EXTRACT(EPOCH FROM (NOW() - s.fecha_apertura)) / 3600 AS "horasActiva",
        DATE(s.fecha_apertura) < CURRENT_DATE AS "esDiaAnterior"
      FROM sesiones_caja s
      INNER JOIN cajas c ON c.id = s.caja_id
      INNER JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.estado = 'abierta'
      ORDER BY s.fecha_apertura ASC
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
        transfers: recentTransfers.rows || recentTransfers,
        activeSessions: activeSessions.rows || [],
      },
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
