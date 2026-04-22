import { NextResponse } from "next/server";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { suscripciones, clientes } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Calcular la suma de precio_mensual solo para clientes activos y suscripciones activas
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${suscripciones.precioMensual} AS DECIMAL)), 0)`,
      })
      .from(suscripciones)
      .innerJoin(clientes, eq(suscripciones.clienteId, clientes.id))
      .where(
        and(
          sql`LOWER(${clientes.estado}) = 'activo'`,
          sql`LOWER(${suscripciones.estado}) = 'activo'`,
        )
      );

    const totalNetoMensual = Number(result[0]?.total || 0);

    return NextResponse.json({
      success: true,
      data: {
        totalNetoMensual,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching net monthly income:", error);
    return NextResponse.json(
      {
        success: false,
        error: message,
        data: { totalNetoMensual: 0 },
      },
      { status: 200 },
    );
  }
}
