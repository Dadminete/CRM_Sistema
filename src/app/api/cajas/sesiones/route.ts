import { NextRequest } from "next/server";

import { and, eq, gte, lt, sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { cajas, movimientosContables, sesionesCaja, usuarios, categoriasCuentas } from "@/lib/db/schema";
import { jsonResponse } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(req.url);
    const cajaId = searchParams.get("cajaId");
    const usuarioId = searchParams.get("usuarioId");

    let sessionQuery = eq(sesionesCaja.estado, "abierta");
    if (cajaId) {
      sessionQuery = and(sessionQuery, eq(sesionesCaja.cajaId, cajaId));
    }
    if (usuarioId) {
      sessionQuery = and(sessionQuery, eq(sesionesCaja.usuarioId, usuarioId));
    }

    const session = await db
      .select({
        ...sesionesCaja,
        cajaNombre: cajas.nombre,
        usuarioNombre: usuarios.nombre,
      })
      .from(sesionesCaja)
      .leftJoin(cajas, eq(sesionesCaja.cajaId, cajas.id))
      .leftJoin(usuarios, eq(sesionesCaja.usuarioId, usuarios.id))
      .where(sessionQuery)
      .limit(1);

    let activeSession: any = session.length > 0 ? session[0] : null;
    const targetCajaId = cajaId || (activeSession ? activeSession.cajaId : null);
    let dailyTotals = { ingresos: "0", gastos: "0" };

    if (targetCajaId) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      // Obtener ID de la categoría de traspasos
      const traspasoCat = await db
        .select({ id: categoriasCuentas.id })
        .from(categoriasCuentas)
        .where(eq(categoriasCuentas.codigo, "TRASP-001"))
        .limit(1);
      const traspasoCatId = traspasoCat[0]?.id ?? null;

      const [ingresosHoy, gastosHoy] = await Promise.all([
        db
          .select({ total: sql<string>`COALESCE(SUM(monto), 0)` })
          .from(movimientosContables)
          .where(
            and(
              eq(movimientosContables.cajaId, targetCajaId),
              sql`${movimientosContables.tipo} IN ('ingreso', 'traspaso')`,
              gte(movimientosContables.fecha, startOfToday.toISOString()),
              lt(movimientosContables.fecha, startOfTomorrow.toISOString()),
            ),
          ),
        db
          .select({ total: sql<string>`COALESCE(SUM(monto), 0)` })
          .from(movimientosContables)
          .where(
            and(
              eq(movimientosContables.cajaId, targetCajaId),
              sql`${movimientosContables.tipo} IN ('gasto', 'egreso')`,
              gte(movimientosContables.fecha, startOfToday.toISOString()),
              lt(movimientosContables.fecha, startOfTomorrow.toISOString()),
            ),
          ),
      ]);

      dailyTotals = {
        ingresos: ingresosHoy[0].total,
        gastos: gastosHoy[0].total,
      };

      if (activeSession) {
        const [ingresosSesion, gastosSesion, traspasosInSesion, traspasosOutSesion] = await Promise.all([
          // Ingresos normales (no traspasos)
          db
            .select({ total: sql<string>`COALESCE(SUM(monto), 0)` })
            .from(movimientosContables)
            .where(
              and(
                eq(movimientosContables.cajaId, activeSession.cajaId),
                sql`${movimientosContables.tipo} IN ('ingreso', 'traspaso')`,
                traspasoCatId ? sql`${movimientosContables.categoriaId} != ${traspasoCatId}` : sql`TRUE`,
                gte(movimientosContables.fecha, activeSession.fechaApertura),
              ),
            ),
          // Gastos normales (no traspasos)
          db
            .select({ total: sql<string>`COALESCE(SUM(monto), 0)` })
            .from(movimientosContables)
            .where(
              and(
                eq(movimientosContables.cajaId, activeSession.cajaId),
                sql`${movimientosContables.tipo} IN ('gasto', 'egreso')`,
                traspasoCatId ? sql`${movimientosContables.categoriaId} != ${traspasoCatId}` : sql`TRUE`,
                gte(movimientosContables.fecha, activeSession.fechaApertura),
              ),
            ),
          // Traspasos Recibidos
          db
            .select({ total: sql<string>`COALESCE(SUM(monto), 0)` })
            .from(movimientosContables)
            .where(
              and(
                eq(movimientosContables.cajaId, activeSession.cajaId),
                sql`${movimientosContables.tipo} IN ('ingreso', 'traspaso')`,
                traspasoCatId ? eq(movimientosContables.categoriaId, traspasoCatId) : sql`FALSE`,
                gte(movimientosContables.fecha, activeSession.fechaApertura),
              ),
            ),
          // Traspasos Enviados
          db
            .select({ total: sql<string>`COALESCE(SUM(monto), 0)` })
            .from(movimientosContables)
            .where(
              and(
                eq(movimientosContables.cajaId, activeSession.cajaId),
                sql`${movimientosContables.tipo} IN ('gasto', 'egreso')`,
                traspasoCatId ? eq(movimientosContables.categoriaId, traspasoCatId) : sql`FALSE`,
                gte(movimientosContables.fecha, activeSession.fechaApertura),
              ),
            ),
        ]);

        activeSession = {
          ...activeSession,
          totalIngresos: ingresosSesion[0].total,
          totalGastos: gastosSesion[0].total,
          totalTraspasosIngreso: traspasosInSesion[0].total,
          totalTraspasosGasto: traspasosOutSesion[0].total,
        };
      }
    }

    return jsonResponse({
      success: true,
      data: activeSession,
      activeSession,
      dailyTotals,
    });
  } catch (error: any) {
    console.error("Error fetching session:", error);
    return jsonResponse({ success: false, error: error.message }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();
    const { action, cajaId, monto, observaciones } = body;
    const usuarioId = user.id;

    if (action === "abrir") {
      const activa = await db
        .select()
        .from(sesionesCaja)
        .where(and(eq(sesionesCaja.cajaId, cajaId), eq(sesionesCaja.estado, "abierta")))
        .limit(1);

      if (activa.length > 0) {
        return jsonResponse({ success: false, error: "Esta caja ya tiene una sesión abierta." }, { status: 400 });
      }

      const [newSession] = await db
        .insert(sesionesCaja)
        .values({
          cajaId,
          usuarioId,
          montoApertura: monto.toString(),
          estado: "abierta",
          observaciones,
          updatedAt: new Date().toISOString(),
        })
        .returning();

      return jsonResponse({ success: true, data: newSession });
    }

    if (action === "cerrar") {
      const { sessionId, montoCierre, observaciones } = body;

      if (!sessionId) {
        return jsonResponse({ success: false, error: "ID de sesión requerido para cerrar." }, { status: 400 });
      }

      const [closedSession] = await db
        .update(sesionesCaja)
        .set({
          estado: "cerrada",
          montoCierre: montoCierre.toString(),
          fechaCierre: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          observaciones: observaciones
            ? sql`COALESCE(${sesionesCaja.observaciones}, '') || E'\n[CIERRE]: ' || ${observaciones}`
            : undefined,
        })
        .where(and(eq(sesionesCaja.id, sessionId), eq(sesionesCaja.estado, "abierta")))
        .returning();

      if (!closedSession) {
        return jsonResponse({ success: false, error: "No se encontró una sesión abierta para cerrar." }, { status: 404 });
      }

      return jsonResponse({ success: true, data: closedSession });
    }

    return jsonResponse({ success: false, error: "Acción no válida." }, { status: 400 });
  } catch (error: any) {
    console.error("Error in sessions API:", error);
    return jsonResponse({ success: false, error: error.message }, { status: 500 });
  }
});
