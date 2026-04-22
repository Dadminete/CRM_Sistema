import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { movimientosContables, cajas, sesionesCaja } from "@/lib/db/schema";
import { and, gte, lte, sql, eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Obtener el primer y último día del mes actual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Obtener estado de la caja de papelería
    const cajaPapeleria = await db.select().from(cajas).where(eq(cajas.nombre, "Papelería")).limit(1);

    let estado = "cerrada";
    if (cajaPapeleria.length > 0) {
      const ultimaSesion = await db
        .select({ estado: sesionesCaja.estado })
        .from(sesionesCaja)
        .where(eq(sesionesCaja.cajaId, cajaPapeleria[0].id))
        .orderBy(desc(sesionesCaja.fechaApertura))
        .limit(1);
      estado = ultimaSesion[0]?.estado || "cerrada";
    }

    const boxId = cajaPapeleria[0]?.id;

    let totalVentas = 0;
    if (boxId) {
      const ventasDelMes = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)`,
        })
        .from(movimientosContables)
        .where(
          and(
            eq(movimientosContables.cajaId, boxId),
            sql`(${movimientosContables.descripcion} ILIKE 'Venta de papelería%' OR ${movimientosContables.descripcion} ILIKE 'Venta de papeleria%')`,
            gte(movimientosContables.fecha, firstDayOfMonth.toISOString()),
            lte(movimientosContables.fecha, lastDayOfMonth.toISOString()),
          ),
        );

      totalVentas = Number(ventasDelMes[0]?.total || 0);
    }

    let totalGastos = 0;

    if (boxId) {
      const gastosDelMes = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)`,
        })
        .from(movimientosContables)
        .where(
          and(
            eq(movimientosContables.cajaId, boxId),
            sql`${movimientosContables.tipo} IN ('gasto', 'egreso', 'traspaso')`,
            sql`${movimientosContables.descripcion} NOT LIKE '%Ajuste%'`,
            sql`${movimientosContables.descripcion} NOT LIKE '%REGULARIZACION%'`,
            gte(movimientosContables.fecha, firstDayOfMonth.toISOString()),
            lte(movimientosContables.fecha, lastDayOfMonth.toISOString()),
          ),
        );

      totalGastos = Number(gastosDelMes[0]?.total || 0);
    }

    // 3. Obtener historial de los últimos 15 días en UNA SOLA consulta (Optimizado)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 14);
    fifteenDaysAgo.setHours(0, 0, 0, 0);

    const historyRaw = await db.execute(sql`
      SELECT 
        TO_CHAR(DATE_TRUNC('day', fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santo_Domingo'), 'DD/MM') as dia,
        COALESCE(SUM(CASE WHEN (descripcion ILIKE 'Venta de papelería%' OR descripcion ILIKE 'Venta de papeleria%') THEN CAST(monto AS DECIMAL) ELSE 0 END), 0) as ventas,
        COALESCE(SUM(CASE WHEN tipo IN ('gasto', 'egreso', 'traspaso') THEN CAST(monto AS DECIMAL) ELSE 0 END), 0) as gastos
      FROM movimientos_contables
      WHERE caja_id = ${boxId}
        AND fecha >= ${fifteenDaysAgo.toISOString()}
      GROUP BY DATE_TRUNC('day', fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santo_Domingo')
      ORDER BY DATE_TRUNC('day', fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santo_Domingo') ASC
    `);

    const historyMap = new Map();
    (historyRaw.rows || []).forEach((row: any) => {
      historyMap.set(row.dia, {
        ventas: Number(row.ventas),
        gastos: Number(row.gastos)
      });
    });

    const ultimosDias = [];
    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getDate()}/${d.getMonth() + 1}`;
      const stat = historyMap.get(key.padStart(5, '0').replace(/^0/, '')) || 
                 historyMap.get(String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0')) ||
                 { ventas: 0, gastos: 0 };
      
      ultimosDias.push({
        fecha: key,
        ventas: stat.ventas,
        gastos: stat.gastos,
      });
    }


    return NextResponse.json({
      success: true,
      data: {
        balanceActual: Number(cajaPapeleria[0]?.saldoActual || 0),
        ventasDelMes: totalVentas,
        gastosDelMes: totalGastos,
        ultimosDias,
        estado,
      },
    });
  } catch (error: any) {
    console.error("Error fetching Papeleria stats:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
