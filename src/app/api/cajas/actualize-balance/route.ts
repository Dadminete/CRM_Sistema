import { db } from "@/lib/db";
import { cajas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cajaId, nuevoSaldo } = body;

    if (!cajaId || nuevoSaldo === undefined) {
      return NextResponse.json(
        { success: false, error: "cajaId y nuevoSaldo requeridos" },
        { status: 400 }
      );
    }

    const caja = await db.query.cajas.findFirst({
      where: eq(cajas.id, cajaId),
    });

    if (!caja) {
      return NextResponse.json({ success: false, error: "Caja no encontrada" }, { status: 404 });
    }

    const oldSaldo = parseFloat(caja.saldoActual.toString());

    await db
      .update(cajas)
      .set({
        saldoActual: nuevoSaldo.toString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(cajas.id, cajaId));

    return NextResponse.json({
      success: true,
      message: `Balance ajustado para ${caja.nombre}`,
      data: {
        caja: caja.nombre,
        saldoAnterior: oldSaldo,
        saldoNuevo: nuevoSaldo,
        diferencia: nuevoSaldo - oldSaldo,
      },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
