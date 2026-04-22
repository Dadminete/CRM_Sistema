import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { clientes } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await db
      .select({
        id: clientes.id,
        nombre: clientes.nombre,
        apellidos: clientes.apellidos,
        fechaIngreso: clientes.fechaIngreso,
        estado: clientes.estado,
        codigoCliente: clientes.codigoCliente,
        fotoUrl: clientes.fotoUrl,
      })
      .from(clientes)
      .orderBy(desc(clientes.fechaIngreso))
      .limit(10);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching recent clients:", error);
    return NextResponse.json({ success: false, error: "Error al cargar clientes recientes" }, { status: 500 });
  }
}
