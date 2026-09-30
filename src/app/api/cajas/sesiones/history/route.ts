import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sesionesCaja, cajas, usuarios, movimientosContables, categoriasCuentas } from "@/lib/db/schema";
import { eq, and, sql, desc, gte, lte, or, nvl, ne, inArray, isNull } from "drizzle-orm";

async function getSessionHistory(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cajaId = searchParams.get("cajaId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const traspasoCat = await db
      .select({ id: categoriasCuentas.id })
      .from(categoriasCuentas)
      .where(eq(categoriasCuentas.codigo, "TRASP-001"))
      .limit(1);
    const traspasoCatId = traspasoCat[0]?.id ?? null;

    const requestedLimit = Number.parseInt(searchParams.get("limit") ?? "20", 10);
    const requestedOffset = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;
    const offset = Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0;

    let baseQuery = db
      .select({
        id: sesionesCaja.id,
        cajaId: sesionesCaja.cajaId,
        usuarioId: sesionesCaja.usuarioId,
        fechaApertura: sesionesCaja.fechaApertura,
        fechaCierre: sesionesCaja.fechaCierre,
        montoApertura: sesionesCaja.montoApertura,
        montoCierre: sesionesCaja.montoCierre,
        estado: sesionesCaja.estado,
        observaciones: sesionesCaja.observaciones,
        cajaNombre: cajas.nombre,
        usuarioNombre: usuarios.nombre,
      })
      .from(sesionesCaja)
      .leftJoin(cajas, eq(sesionesCaja.cajaId, cajas.id))
      .leftJoin(usuarios, eq(sesionesCaja.usuarioId, usuarios.id));

    const filters = [];
    if (cajaId) filters.push(eq(sesionesCaja.cajaId, cajaId));
    if (startDate) filters.push(gte(sesionesCaja.fechaApertura, startDate));
    if (endDate) filters.push(lte(sesionesCaja.fechaApertura, endDate));

    if (filters.length > 0) {
      baseQuery.where(and(...filters));
    }

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(sesionesCaja)
      .where(filters.length > 0 ? and(...filters) : undefined);

    const sessions = await baseQuery.orderBy(desc(sesionesCaja.fechaApertura)).limit(limit).offset(offset);

    const sessionIds = sessions.map((session) => session.id);
    const totals = sessionIds.length
      ? await db
          .select({
            sessionId: sesionesCaja.id,
            ingresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientosContables.tipo} IN ('ingreso', 'traspaso') THEN CAST(${movimientosContables.monto} AS DECIMAL) ELSE 0 END), 0)`,
            gastos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientosContables.tipo} IN ('gasto', 'egreso') THEN CAST(${movimientosContables.monto} AS DECIMAL) ELSE 0 END), 0)`,
          })
          .from(sesionesCaja)
          .leftJoin(
            movimientosContables,
            and(
              eq(movimientosContables.cajaId, sesionesCaja.cajaId),
              gte(movimientosContables.fecha, sesionesCaja.fechaApertura),
              or(isNull(sesionesCaja.fechaCierre), lte(movimientosContables.fecha, sesionesCaja.fechaCierre)),
            ),
          )
          .where(inArray(sesionesCaja.id, sessionIds))
          .groupBy(sesionesCaja.id)
      : [];
    const totalsBySession = new Map(totals.map((total) => [total.sessionId, total]));
    const detailedSessions = sessions.map((session) => {
      const total = totalsBySession.get(session.id);
      return {
        ...session,
        totalIngresos: Number.parseFloat(total?.ingresos ?? "0"),
        totalGastos: Number.parseFloat(total?.gastos ?? "0"),
      };
    });

    return NextResponse.json({
      success: true,
      data: detailedSessions,
      pagination: {
        total: totalCount[0].count,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error("Error fetching session history:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function updateSession(req: Request) {
  try {
    const body = await req.json();
    const { id, montoApertura, montoCierre, observaciones } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID de sesión requerido" }, { status: 400 });
    }

    await db
      .update(sesionesCaja)
      .set({
        montoApertura: montoApertura ? montoApertura.toString() : undefined,
        montoCierre: montoCierre ? montoCierre.toString() : undefined,
        observaciones,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(sesionesCaja.id, id));

    return NextResponse.json({ success: true, message: "Sesión actualizada correctamente" });
  } catch (error: any) {
    console.error("Error updating session:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const GET = withAuth(async (req) => getSessionHistory(req), {
  requiredPermission: "contabilidad.balance_general",
});
export const PUT = withAuth(async (req) => updateSession(req), { requiredPermission: "cajas.configuracion" });
