import { NextResponse } from "next/server";
import { desc, and, gte, lte, eq, ne } from "drizzle-orm";
import { endOfMonth, startOfMonth } from "date-fns";

import { db } from "@/lib/db";
import { categoriasCuentas, movimientosContables } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const firstDay = startOfMonth(now);
    const lastDay = endOfMonth(now);

    const traspasoCat = await db
      .select({ id: categoriasCuentas.id })
      .from(categoriasCuentas)
      .where(eq(categoriasCuentas.codigo, "TRASP-001"))
      .limit(1);
    const traspasoCatId = traspasoCat[0]?.id ?? null;

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
        traspasoCatId
          ? and(
              gte(movimientosContables.fecha, firstDay.toISOString()),
              lte(movimientosContables.fecha, lastDay.toISOString()),
              ne(movimientosContables.categoriaId, traspasoCatId),
            )
          : and(gte(movimientosContables.fecha, firstDay.toISOString()), lte(movimientosContables.fecha, lastDay.toISOString())),
      )
      .orderBy(desc(movimientosContables.fecha));

    return NextResponse.json({
      success: true,
      data: movements,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching movements:", error);
    return NextResponse.json({ success: false, error: message, data: [] }, { status: 200 });
  }
}
