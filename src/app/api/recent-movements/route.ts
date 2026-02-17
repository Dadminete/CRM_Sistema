import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { movimientosContables, categoriasCuentas } from "@/lib/db/schema";
import { desc, and, gte, lte, eq } from "drizzle-orm";
import { startOfMonth, endOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const firstDay = startOfMonth(now);
    const lastDay = endOfMonth(now);

    const movements = await db
      .select({
        id: movimientosContables.id,
        tipo: movimientosContables.tipo,
        monto: movimientosContables.monto,
        descripcion: movimientosContables.descripcion,
        fecha: movimientosContables.fecha,
        metodo: movimientosContables.metodo,
        categoria: categoriasCuentas.nombre,
      })
      .from(movimientosContables)
      .leftJoin(categoriasCuentas, eq(movimientosContables.categoriaId, categoriasCuentas.id))
      .where(
        and(
          gte(movimientosContables.fecha, firstDay.toISOString()),
          lte(movimientosContables.fecha, lastDay.toISOString()),
        ),
      )
      .orderBy(desc(movimientosContables.fecha));

    return NextResponse.json({
      success: true,
      data: movements,
    });
  } catch (error: any) {
    console.error("Error fetching movements:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
