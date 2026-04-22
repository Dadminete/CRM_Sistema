import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proveedores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { jsonResponse } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const lista = await db
      .select({
        id: proveedores.id,
        codigo: proveedores.codigo,
        nombre: proveedores.nombre,
        razonSocial: proveedores.razonSocial,
      })
      .from(proveedores)
      .where(eq(proveedores.activo, true))
      .orderBy(proveedores.nombre);

    return jsonResponse({ success: true, data: lista });
  } catch (error) {
    console.error("Error obteniendo proveedores:", error);
    return NextResponse.json({ error: "No se pudo cargar los proveedores" }, { status: 500 });
  }
}
