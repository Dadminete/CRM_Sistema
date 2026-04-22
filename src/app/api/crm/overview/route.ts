import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  cajas, 
  movimientosContables, 
  sesionesCaja, 
  categoriasCuentas, 
  cuentasBancarias, 
  cuentasContables,
  cuentasPorCobrar,
  facturasClientes,
  pagosClientes,
  suscripciones,
  clientes
} from "@/lib/db/schema";
import { eq, and, gte, lte, sql, desc, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    // --- 1. Caja Principal Stats ---
    const getCajaPrincipalData = async () => {
      const cajaPrincipal = await db.select().from(cajas).where(eq(cajas.nombre, "Caja Principal")).limit(1);
      if (!cajaPrincipal[0]) return null;
      
      const cajaId = cajaPrincipal[0].id;
      const balanceActual = Number(cajaPrincipal[0].saldoActual || 0);

      const [ultimaSesion, gastosMes, historyRaw] = await Promise.all([
        db.select({ estado: sesionesCaja.estado }).from(sesionesCaja).where(eq(sesionesCaja.cajaId, cajaId)).orderBy(desc(sesionesCaja.fechaApertura)).limit(1),
        db.select({ total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)` })
          .from(movimientosContables)
          .where(and(eq(movimientosContables.cajaId, cajaId), sql`${movimientosContables.tipo} IN ('gasto', 'egreso', 'traspaso')`, gte(movimientosContables.fecha, firstDayOfMonth.toISOString()), lte(movimientosContables.fecha, lastDayOfMonth.toISOString()))),
        db.execute(sql`
          SELECT 
            TO_CHAR(DATE_TRUNC('day', fecha AT TIME ZONE 'America/Santo_Domingo'), 'DD/MM') as fecha,
            COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN CAST(monto AS DECIMAL) ELSE 0 END), 0) as ingresos,
            COALESCE(SUM(CASE WHEN tipo IN ('gasto', 'egreso', 'traspaso') THEN CAST(monto AS DECIMAL) ELSE 0 END), 0) as gastos
          FROM movimientos_contables
          WHERE caja_id = ${cajaId} AND fecha >= ${new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()}
          GROUP BY DATE_TRUNC('day', fecha AT TIME ZONE 'America/Santo_Domingo')
          ORDER BY DATE_TRUNC('day', fecha AT TIME ZONE 'America/Santo_Domingo') ASC
        `)
      ]);

      return {
        balanceActual,
        gastosDelMes: Number(gastosMes[0]?.total || 0),
        estado: ultimaSesion[0]?.estado || "cerrada",
        ultimosDias: (historyRaw.rows as any[]).map(r => ({
          fecha: r.fecha,
          ingresos: Number(r.ingresos),
          gastos: Number(r.gastos)
        }))
      };
    };

    // --- 2. Papeleria Stats ---
    const getPapeleriaData = async () => {
      const cajaPapeleria = await db.select().from(cajas).where(eq(cajas.nombre, "Papelería")).limit(1);
      if (!cajaPapeleria[0]) return null;
      
      const boxId = cajaPapeleria[0].id;
      const [ultimaSesion, ventasMes, gastosMes, historyRaw] = await Promise.all([
        db.select({ estado: sesionesCaja.estado }).from(sesionesCaja).where(eq(sesionesCaja.cajaId, boxId)).orderBy(desc(sesionesCaja.fechaApertura)).limit(1),
        db.select({ total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)` })
          .from(movimientosContables)
          .where(and(eq(movimientosContables.cajaId, boxId), sql`(${movimientosContables.descripcion} ILIKE 'Venta de papelería%' OR ${movimientosContables.descripcion} ILIKE 'Venta de papeleria%')`, gte(movimientosContables.fecha, firstDayOfMonth.toISOString()), lte(movimientosContables.fecha, lastDayOfMonth.toISOString()))),
        db.select({ total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)` })
          .from(movimientosContables)
          .where(and(eq(movimientosContables.cajaId, boxId), sql`${movimientosContables.tipo} IN ('gasto', 'egreso', 'traspaso')`, gte(movimientosContables.fecha, firstDayOfMonth.toISOString()), lte(movimientosContables.fecha, lastDayOfMonth.toISOString()))),
        db.execute(sql`
          SELECT 
            TO_CHAR(DATE_TRUNC('day', fecha AT TIME ZONE 'America/Santo_Domingo'), 'DD/MM') as dia,
            COALESCE(SUM(CASE WHEN (descripcion ILIKE 'Venta de papelería%' OR descripcion ILIKE 'Venta de papeleria%') THEN CAST(monto AS DECIMAL) ELSE 0 END), 0) as ventas,
            COALESCE(SUM(CASE WHEN tipo IN ('gasto', 'egreso', 'traspaso') THEN CAST(monto AS DECIMAL) ELSE 0 END), 0) as gastos
          FROM movimientos_contables
          WHERE caja_id = ${boxId} AND fecha >= ${new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()}
          GROUP BY DATE_TRUNC('day', fecha AT TIME ZONE 'America/Santo_Domingo')
          ORDER BY DATE_TRUNC('day', fecha AT TIME ZONE 'America/Santo_Domingo') ASC
        `)
      ]);

      return {
        balanceActual: Number(cajaPapeleria[0].saldoActual || 0),
        ventasDelMes: Number(ventasMes[0]?.total || 0),
        gastosDelMes: Number(gastosMes[0]?.total || 0),
        estado: ultimaSesion[0]?.estado || "cerrada",
        ultimosDias: (historyRaw.rows as any[]).map(r => ({
          fecha: r.dia,
          ventas: Number(r.ventas),
          gastos: Number(r.gastos)
        }))
      };
    };

    // --- 3. Bank Stats ---
    const getBankData = async () => {
      const [accountStats, monthlyStatsRaw] = await Promise.all([
        db.execute(sql`
          SELECT 
            COALESCE(SUM(CAST(cc.saldo_inicial AS DECIMAL)), 0) as total_inicial,
            COALESCE(SUM(CASE WHEN mc.tipo = 'ingreso' THEN CAST(mc.monto AS DECIMAL) ELSE 0 END), 0) as total_ingresos,
            COALESCE(SUM(CASE WHEN mc.tipo = 'gasto' THEN CAST(mc.monto AS DECIMAL) ELSE 0 END), 0) as total_gastos
          FROM cuentas_bancarias cb
          JOIN cuentas_contables cc ON cb.cuenta_contable_id = cc.id
          LEFT JOIN movimientos_contables mc ON mc.cuenta_bancaria_id = cb.id
          WHERE cb.activo = true
        `),
        db.execute(sql`
          SELECT 
            DATE_TRUNC('month', fecha)::date as mes_fecha,
            COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN CAST(monto AS DECIMAL) ELSE 0 END), 0) as ingresos,
            COALESCE(SUM(CASE WHEN tipo = 'gasto' THEN CAST(monto AS DECIMAL) ELSE 0 END), 0) as gastos
          FROM movimientos_contables
          WHERE cuenta_bancaria_id IS NOT NULL 
            AND fecha >= ${new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()}
          GROUP BY DATE_TRUNC('month', fecha)
          ORDER BY DATE_TRUNC('month', fecha) ASC
        `)
      ]);

      const stats = (accountStats.rows[0] as any) || { total_inicial: 0, total_ingresos: 0, total_gastos: 0 };
      const saldoTotal = Number(stats.total_inicial) + Number(stats.total_ingresos) - Number(stats.total_gastos);
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      
      let currentAcc = saldoTotal;
      const rows = (monthlyStatsRaw.rows as any[]).reverse();
      const ultimosMeses = rows.map(r => {
        const d = new Date(r.mes_fecha);
        const res = {
          mes: monthNames[d.getMonth()],
          ingresos: Number(r.ingresos),
          gastos: Number(r.gastos),
          balance: Number(currentAcc.toFixed(2))
        };
        currentAcc -= (Number(r.ingresos) - Number(r.gastos));
        return res;
      }).reverse();

      return { saldoTotal, ultimosMeses };
    };

    // --- 4. Invoice Stats ---
    const getInvoiceData = async () => {
      const [balances, dailyIncome] = await Promise.all([
        db.select({ facturaEstado: facturasClientes.estado, montoPendiente: cuentasPorCobrar.montoPendiente })
          .from(cuentasPorCobrar)
          .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
          .where(or(eq(facturasClientes.estado, "pendiente"), eq(facturasClientes.estado, "parcial"), eq(facturasClientes.estado, "pago parcial"))),
        db.select({ date: sql<string>`DATE(${pagosClientes.fechaPago})`, total: sql<number>`SUM(CAST(${pagosClientes.monto} AS DECIMAL))` })
          .from(pagosClientes)
          .where(gte(pagosClientes.fechaPago, firstDayOfMonth.toISOString().split("T")[0]))
          .groupBy(sql`DATE(${pagosClientes.fechaPago})`)
          .orderBy(sql`DATE(${pagosClientes.fechaPago})`)
      ]);

      let totalPendiente = 0;
      let totalParcial = 0;
      balances.forEach(b => {
        const m = Number(b.montoPendiente || 0);
        totalPendiente += m;
        if (b.facturaEstado?.includes("parcial")) totalParcial += m;
      });

      return {
        totalPendiente,
        totalParcial,
        stats: dailyIncome.map(r => ({ fecha: r.date, ingresos: Number(r.total || 0) }))
      };
    };

    // --- 5. Net Income Stats ---
    const getNetIncomeData = async () => {
      const res = await db.select({ total: sql<number>`COALESCE(SUM(CAST(${suscripciones.precioMensual} AS DECIMAL)), 0)` })
        .from(suscripciones)
        .innerJoin(clientes, eq(suscripciones.clienteId, clientes.id))
        .where(and(sql`LOWER(${clientes.estado}) = 'activo'`, sql`LOWER(${suscripciones.estado}) = 'activo'`));
      return { totalNetoMensual: Number(res[0]?.total || 0) };
    };

    // --- EXECUTE ALL ---
    const [cajaPrincipal, papeleria, banks, invoices, netIncome] = await Promise.all([
      getCajaPrincipalData(),
      getPapeleriaData(),
      getBankData(),
      getInvoiceData(),
      getNetIncomeData()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        cajaPrincipal,
        papeleria,
        banks,
        invoices,
        netIncome
      }
    });

  } catch (error: any) {
    console.error("Dashboard overview error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
