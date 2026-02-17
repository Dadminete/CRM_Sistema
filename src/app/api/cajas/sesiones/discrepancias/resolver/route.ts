import { db } from "@/lib/db";
import { movimientosContables, sesionesCaja } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, monto, tipo, categoriaId, metodo, descripcion, usuarioId } = body;

    if (!sessionId || !monto || !tipo || !categoriaId || !metodo || !usuarioId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // 1. Get session details to get cajaId
    const session = await db.query.sesionesCaja.findFirst({
      where: eq(sesionesCaja.id, sessionId),
    });

    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    // 2. Create adjustment movement
    const [movement] = await db
      .insert(movimientosContables)
      .values({
        tipo,
        monto: monto.toString(),
        categoriaId,
        metodo,
        cajaId: session.cajaId,
        descripcion: descripcion || `Ajuste de discrepancia para sesión ${sessionId}`,
        usuarioId,
        fecha: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    // 3. Update session observations to mark as resolved
    const currentObs = session.observaciones || "";
    const updatedObs = `${currentObs}\n\n[RESOLUCIÓN: AJUSTE REGISTRADO - ID: ${movement.id}]`.trim();

    await db
      .update(sesionesCaja)
      .set({
        observaciones: updatedObs,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(sesionesCaja.id, sessionId));

    return NextResponse.json({
      success: true,
      data: movement,
    });
  } catch (error: any) {
    console.error("Error resolving discrepancy:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
