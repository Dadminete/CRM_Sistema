import { db } from "@/lib/db";
import { movimientosContables, categoriasCuentas, usuarios } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cajaId = searchParams.get("cajaId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!cajaId || !from) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
    }

    const filters = [eq(movimientosContables.cajaId, cajaId), gte(movimientosContables.fecha, from)];

    if (to) {
      filters.push(lte(movimientosContables.fecha, to));
    }

    const moves = await db
      .select({
        id: movimientosContables.id,
        tipo: movimientosContables.tipo,
        monto: movimientosContables.monto,
        metodo: movimientosContables.metodo,
        descripcion: movimientosContables.descripcion,
        fecha: movimientosContables.fecha,
        categoriaNombre: categoriasCuentas.nombre,
        usuarioNombre: usuarios.nombre,
      })
      .from(movimientosContables)
      .leftJoin(categoriasCuentas, eq(movimientosContables.categoriaId, categoriasCuentas.id))
      .leftJoin(usuarios, eq(movimientosContables.usuarioId, usuarios.id))
      .where(and(...filters))
      .orderBy(desc(movimientosContables.fecha));

    return NextResponse.json({
      success: true,
      data: moves,
    });
  } catch (error: any) {
    console.error("Error fetching session movements:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
