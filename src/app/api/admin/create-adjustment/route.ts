import { db } from "@/lib/db";
import { movimientosContables, categoriasCuentas } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cajaId, monto, descripcion, usuarioId } = body;

    if (!cajaId || !monto || !usuarioId) {
      return NextResponse.json(
        { success: false, error: "cajaId, monto y usuarioId son requeridos" },
        { status: 400 }
      );
    }

    // Get or create "Ajuste Contable" category
    let ajusteCategoria = await db.query.categoriasCuentas.findFirst({
      where: eq(categoriasCuentas.codigo, "AJUSTE-001"),
    });

    if (!ajusteCategoria) {
      // Create it
      const [newCat] = await db
        .insert(categoriasCuentas)
        .values({
          codigo: "AJUSTE-001",
          nombre: "Ajuste Contable",
          tipo: "otro",
          descripcion: "Ajustes por corrección de descuadres históricos",
        })
        .returning();
      ajusteCategoria = newCat;
    }

    // Create adjustment movement
    const [adjustment] = await db
      .insert(movimientosContables)
      .values({
        tipo: "gasto",
        monto: monto.toString(),
        categoriaId: ajusteCategoria.id,
        metodo: "ajuste",
        cajaId: cajaId,
        descripcion: descripcion || `Ajuste contable por corrección de descuadre histórico`,
        usuarioId: usuarioId,
        fecha: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: `Ajuste contable creado exitosamente`,
      data: {
        ajusteId: adjustment.id,
        monto: monto,
        tipo: "gasto",
        descripcion: adjustment.descripcion,
      },
    });
  } catch (error: any) {
    console.error("Error creating adjustment:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
