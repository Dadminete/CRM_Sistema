import { db } from "@/lib/db";
import { banks, cuentasBancarias, movimientosContables, categoriasCuentas, cuentasContables } from "@/lib/db/schema";
import { eq, and, sql, desc, ne } from "drizzle-orm";
import { subDays, startOfDay } from "date-fns";
import { jsonResponse } from "@/lib/serializers";

export const dynamic = "force-dynamic";

function rowsFromExecuteResult<T>(result: any): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }
  if (result && Array.isArray(result.rows)) {
    return result.rows as T[];
  }
  return [];
}

export async function GET() {
  try {
    const today = startOfDay(new Date());
    const sevenDaysAgo = subDays(today, 7);

    // Get transfer category ID if exists (non-blocking)
    let traspasoCatId: number | null = null;
    try {
      const traspasoCat = await db
        .select({ id: categoriasCuentas.id })
        .from(categoriasCuentas)
        .where(eq(categoriasCuentas.codigo, "TRASP-001"))
        .limit(1);
      traspasoCatId = traspasoCat[0]?.id ?? null;
    } catch {
      traspasoCatId = null;
    }

    // 1. Accurate Balances by scanning all movements
    const accountsDataRaw = await db.execute(sql`
      SELECT 
        cb.id,
        cb.tipo_cuenta as "type",
        b.nombre as "bank_name",
        cb.numero_cuenta,
        CAST(cc.saldo_inicial AS NUMERIC) as "saldo_inicial",
        COALESCE(SUM(CASE WHEN mc.tipo = 'ingreso' THEN CAST(mc.monto AS NUMERIC) ELSE 0 END), 0) as ingresos,
        COALESCE(SUM(CASE WHEN mc.tipo = 'gasto' THEN CAST(mc.monto AS NUMERIC) ELSE 0 END), 0) as gastos
      FROM cuentas_bancarias cb
      INNER JOIN banks b ON b.id = cb.bank_id
      INNER JOIN cuentas_contables cc ON cc.id = cb.cuenta_contable_id
      LEFT JOIN movimientos_contables mc ON mc.cuenta_bancaria_id = cb.id
      WHERE cb.activo = true
      GROUP BY cb.id, b.nombre, cb.numero_cuenta, cc.saldo_inicial, cb.tipo_cuenta
    `);

    let totalBalance = 0;
    const distMap = new Map<string, number>();
    const boxesData: any[] = [];

    rowsFromExecuteResult(accountsDataRaw).forEach((row: any) => {
      const saldoInicial = Number(row.saldo_inicial || 0);
      const ingresos = Number(row.ingresos || 0);
      const gastos = Number(row.gastos || 0);
      const balance = saldoInicial + ingresos - gastos;

      totalBalance += balance;

      const bankName = String(row.bank_name);
      distMap.set(bankName, (distMap.get(bankName) || 0) + balance);

      boxesData.push({
        name: `${bankName} - ${row.numero_cuenta}`,
        balance: balance,
        type: row.type || "Desconocido",
      });
    });

    const distribution = Array.from(distMap.entries())
      .map(([source, value]) => ({ source, value }))
      .sort((a, b) => b.value - a.value);

    // Sort boxes by highest balance
    boxesData.sort((a, b) => b.balance - a.balance);
    const activeAccountsCount = boxesData.length;

    // 2. Overview Metrics (Today's performance)
    const dailyStatsData = await db
      .select({
        ingresosHoy: sql<string>`COALESCE(SUM(CASE WHEN tipo = 'ingreso' AND fecha >= ${today.toISOString()} THEN monto ELSE 0 END), 0)`,
        gastosHoy: sql<string>`COALESCE(SUM(CASE WHEN tipo = 'gasto' AND fecha >= ${today.toISOString()} THEN monto ELSE 0 END), 0)`,
      })
      .from(movimientosContables)
      .where(
        and(
          sql`cuenta_bancaria_id IS NOT NULL`,
          traspasoCatId ? ne(movimientosContables.categoriaId, traspasoCatId) : sql`true`
        )
      );
    const dailyStats = dailyStatsData[0] || { ingresosHoy: "0", gastosHoy: "0" };

    // 3. Historical Trend (Last 7 Days)
    const historyData = await db.execute(sql`
        SELECT 
          TO_CHAR(fecha, 'DD-MM') as date,
          SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as ingresos,
          SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END) as gastos
        FROM movimientos_contables
        WHERE fecha >= ${sevenDaysAgo.toISOString()} 
          AND cuenta_bancaria_id IS NOT NULL
          ${traspasoCatId ? sql`AND categoria_id != ${traspasoCatId}` : sql``}
        GROUP BY TO_CHAR(fecha, 'DD-MM'), DATE_TRUNC('day', fecha)
        ORDER BY DATE_TRUNC('day', fecha) ASC
      `);

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
          sql`cuenta_bancaria_id IS NOT NULL`,
          traspasoCatId ? ne(movimientosContables.categoriaId, traspasoCatId) : sql`true`
        )
      )
      .orderBy(desc(movimientosContables.fecha))
      .limit(10);

    // 6. Recent Transfers (best effort: some deployments may not have this table yet)
    let recentTransfers: any[] = [];
    try {
      const transferResult = await db.execute(sql`
        SELECT 
          t.id,
          t.numero_traspaso AS "numero",
          t.concepto_traspaso AS "concepto",
          t.monto,
          t.fecha_traspaso AS "fecha",
          bo.numero_cuenta AS "bancoOrigenNombre",
          bd.numero_cuenta AS "bancoDestinoNombre"
        FROM traspasos t
        LEFT JOIN cuentas_bancarias bo ON bo.id = t.banco_origen_id
        LEFT JOIN cuentas_bancarias bd ON bd.id = t.banco_destino_id
        WHERE t.banco_origen_id IS NOT NULL OR t.banco_destino_id IS NOT NULL
        ORDER BY t.fecha_traspaso DESC
        LIMIT 10
      `);
      recentTransfers = rowsFromExecuteResult(transferResult);
    } catch (transferError) {
      console.warn("Bancos Dashboard: recent transfers unavailable", transferError);
    }

    return jsonResponse({
      success: true,
      data: {
        overview: {
          totalBalance: totalBalance,
          ingresosHoy: dailyStats.ingresosHoy,
          gastosHoy: dailyStats.gastosHoy,
          activeAccounts: activeAccountsCount,
          discrepancias: 0,
        },
        history: rowsFromExecuteResult(historyData),
        distribution,
        boxes: boxesData,
        recent: recentMovements,
        transfers: recentTransfers,
        activeSessions: [],
      },
    });
  } catch (error: any) {
    console.error("Bancos Dashboard API Error:", error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
