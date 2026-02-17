import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sesionesCaja, cajas, movimientosContables } from "@/lib/db/schema";
import { eq, and, sql, desc, gte } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cajaId = searchParams.get("cajaId");
    const usuarioId = searchParams.get("usuarioId");

    if (!usuarioId) {
      return NextResponse.json({ success: false, error: "Usuario no proporcionado" }, { status: 400 });
    }

    // 1. Buscar sesión activa
    let sessionQuery = and(eq(sesionesCaja.usuarioId, usuarioId), eq(sesionesCaja.estado, "abierta"));
    if (cajaId) {
      sessionQuery = and(sessionQuery, eq(sesionesCaja.cajaId, cajaId));
    }

    const session = await db
      .select({
        ...sesionesCaja,
        cajaNombre: cajas.nombre,
      })
      .from(sesionesCaja)
      .leftJoin(cajas, eq(sesionesCaja.cajaId, cajas.id))
      .where(sessionQuery)
      .limit(1);

    let activeSession: any = session.length > 0 ? session[0] : null;

    // 2. Calcular totales (Diarios y de la Sesión Activa)
    const targetCajaId = cajaId || (activeSession ? activeSession.cajaId : null);
    let dailyTotals = { ingresos: "0", gastos: "0" };

    if (targetCajaId) {
      const today = new Date().toISOString().split("T")[0];

      // Totales del día (para el card de "Estado del Turno")
      const [ingresosHoy, gastosHoy] = await Promise.all([
        db
          .select({ total: sql<string>`COALESCE(SUM(monto), 0)` })
          .from(movimientosContables)
          .where(
            and(
              eq(movimientosContables.cajaId, targetCajaId),
              eq(movimientosContables.tipo, "ingreso"),
              gte(movimientosContables.fecha, today),
            ),
          ),
        db
          .select({ total: sql<string>`COALESCE(SUM(monto), 0)` })
          .from(movimientosContables)
          .where(
            and(
              eq(movimientosContables.cajaId, targetCajaId),
              eq(movimientosContables.tipo, "gasto"),
              gte(movimientosContables.fecha, today),
            ),
          ),
      ]);

      dailyTotals = {
        ingresos: ingresosHoy[0].total,
        gastos: gastosHoy[0].total,
      };

      // Totales de la Sesión Activa (si existe, para el cálculo de cierre)
      if (activeSession) {
        const [ingresosSesion, gastosSesion] = await Promise.all([
          db
            .select({ total: sql<string>`COALESCE(SUM(monto), 0)` })
            .from(movimientosContables)
            .where(
              and(
                eq(movimientosContables.cajaId, activeSession.cajaId),
                eq(movimientosContables.tipo, "ingreso"),
                gte(movimientosContables.fecha, activeSession.fechaApertura),
              ),
            ),
          db
            .select({ total: sql<string>`COALESCE(SUM(monto), 0)` })
            .from(movimientosContables)
            .where(
              and(
                eq(movimientosContables.cajaId, activeSession.cajaId),
                eq(movimientosContables.tipo, "gasto"),
                gte(movimientosContables.fecha, activeSession.fechaApertura),
              ),
            ),
        ]);

        activeSession = {
          ...activeSession,
          totalIngresos: ingresosSesion[0].total,
          totalGastos: gastosSesion[0].total,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: activeSession,
      activeSession,
      dailyTotals,
    });
  } catch (error: any) {
    console.error("Error fetching session:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, cajaId, monto, observaciones, usuarioId = "df4b1335-5ff6-4703-8dcd-3e2f74fb0822" } = body;

    if (action === "abrir") {
      // Verificar si ya hay una sesión abierta para esta caja
      const activa = await db
        .select()
        .from(sesionesCaja)
        .where(and(eq(sesionesCaja.cajaId, cajaId), eq(sesionesCaja.estado, "abierta")))
        .limit(1);

      if (activa.length > 0) {
        return NextResponse.json({ success: false, error: "Esta caja ya tiene una sesión abierta." }, { status: 400 });
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

      return NextResponse.json({ success: true, data: newSession });
    }

    if (action === "cerrar") {
      const { sessionId, montoCierre, observaciones } = body;

      if (!sessionId) {
        return NextResponse.json({ success: false, error: "ID de sesión requerido para cerrar." }, { status: 400 });
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
        .where(eq(sesionesCaja.id, sessionId))
        .returning();

      return NextResponse.json({ success: true, data: closedSession });
    }

    return NextResponse.json({ success: false, error: "Acción no válida." }, { status: 400 });
  } catch (error: any) {
    console.error("Error in sessions API:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
