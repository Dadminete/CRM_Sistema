import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { suscripciones, clientes } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { jsonResponse } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .selectDistinct({ dia: suscripciones.diaFacturacion })
      .from(suscripciones)
      .innerJoin(clientes, sql`${suscripciones.clienteId} = ${clientes.id}`)
      .where(sql`
        ${suscripciones.diaFacturacion} IS NOT NULL 
        AND LOWER(COALESCE(${suscripciones.estado}, '')) = 'activo'
        AND LOWER(COALESCE(${clientes.estado}, '')) = 'activo'
      `)
      .orderBy(suscripciones.diaFacturacion);

    const dias = rows.map((r) => r.dia).filter((d) => d !== null && d !== undefined) as number[];

    return jsonResponse({ success: true, data: dias });
  } catch (error) {
    console.error("[DIAS_FACTURACION] Error:", error);
    return NextResponse.json({ success: false, error: "Error al obtener los días de facturación" }, { status: 500 });
  }
}
