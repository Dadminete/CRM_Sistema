import { NextResponse } from "next/server";

import { desc, eq, isNull, ne, or } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { banks, categoriasCuentas, movimientosContables } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

async function getRecentMovements() {
  try {
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
        banco: banks.nombre,
        categoria: categoriasCuentas.nombre,
      })
      .from(movimientosContables)
      .leftJoin(categoriasCuentas, eq(movimientosContables.categoriaId, categoriasCuentas.id))
      .leftJoin(banks, eq(movimientosContables.bankId, banks.id))
      .where(
        traspasoCatId
          ? or(isNull(movimientosContables.categoriaId), ne(movimientosContables.categoriaId, traspasoCatId))
          : undefined,
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

export const GET = withAuth(async () => getRecentMovements(), { requiredPermission: "contabilidad.balance_general" });
