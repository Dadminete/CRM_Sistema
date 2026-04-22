import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cajas, movimientosContables, sesionesCaja, categoriasCuentas } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Get TRASP-001 category id
    const traspasoCat = await db
      .select({ id: categoriasCuentas.id })
      .from(categoriasCuentas)
      .where(eq(categoriasCuentas.codigo, "TRASP-001"))
      .limit(1);

    const traspasoCatId = traspasoCat[0]?.id ?? null;

    // 2. Get Caja Principal
    const cajaPrincipal = await db
      .select()
      .from(cajas)
      .where(eq(cajas.nombre, "Caja Principal"))
      .limit(1);

    if (!cajaPrincipal || cajaPrincipal.length === 0) {
      return NextResponse.json({ success: false, error: "Caja Principal no encontrada" }, { status: 404 });
    }

    const cajaId = cajaPrincipal[0].id;
    const balanceActual = Number(cajaPrincipal[0].saldoActual || 0);

    // 3. Last session state
    const ultimaSesion = await db
      .select({ estado: sesionesCaja.estado })
      .from(sesionesCaja)
      .where(eq(sesionesCaja.cajaId, cajaId))
      .orderBy(desc(sesionesCaja.fechaApertura))
      .limit(1);

    const estado = ultimaSesion[0]?.estado || "cerrada";

    // 4. Monthly expenses
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const gastosDelMes = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)`,
      })
      .from(movimientosContables)
      .where(
        and(
          eq(movimientosContables.cajaId, cajaId),
          sql`${movimientosContables.tipo} IN ('gasto', 'egreso', 'traspaso')`,
          gte(movimientosContables.fecha, firstDayOfMonth.toISOString()),
          lte(movimientosContables.fecha, lastDayOfMonth.toISOString()),
        ),
      );

    const totalGastos = Number(gastosDelMes[0]?.total || 0);

    // 5. Last 15 days history — ONE aggregated query instead of 30 sequential queries
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 14);
    fifteenDaysAgo.setHours(0, 0, 0, 0);

    // Build the traspaso exclusion condition safely (handles NULL categoria_id)
    const traspasoExclusion = traspasoCatId
      ? sql`AND (${movimientosContables.categoriaId} != ${traspasoCatId} OR ${movimientosContables.categoriaId} IS NULL)`
      : sql``;

    const historyRaw = await db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('day', fecha AT TIME ZONE 'America/Santo_Domingo'), 'DD/MM') AS fecha,
        COALESCE(SUM(CASE WHEN tipo = 'ingreso' ${traspasoExclusion} THEN CAST(monto AS DECIMAL) ELSE 0 END), 0) AS ingresos,
        COALESCE(SUM(CASE WHEN tipo IN ('gasto', 'egreso', 'traspaso') THEN CAST(monto AS DECIMAL) ELSE 0 END), 0) AS gastos
      FROM movimientos_contables
      WHERE caja_id = ${cajaId}
        AND fecha >= ${fifteenDaysAgo.toISOString()}
      GROUP BY DATE_TRUNC('day', fecha AT TIME ZONE 'America/Santo_Domingo')
      ORDER BY DATE_TRUNC('day', fecha AT TIME ZONE 'America/Santo_Domingo') ASC
    `);

    // Fill in any missing days with zeros so we always have 15 data points
    const historyMap = new Map<string, { ingresos: number; gastos: number }>();
    for (const row of (historyRaw.rows ?? [])) {
      const r = row as any;
      historyMap.set(r.fecha as string, {
        ingresos: Number(r.ingresos),
        gastos: Number(r.gastos),
      });
    }

    const ultimosDias: { fecha: string; ingresos: number; gastos: number }[] = [];
    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      ultimosDias.push({
        fecha: key,
        ingresos: historyMap.get(key)?.ingresos ?? 0,
        gastos: historyMap.get(key)?.gastos ?? 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        balanceActual,
        gastosDelMes: totalGastos,
        ultimosDias,
        estado,
      },
    });
  } catch (error: any) {
    console.error("Error fetching Caja Principal data:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

