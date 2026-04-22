import { NextResponse } from "next/server";
import { desc, not, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bitacora } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await db
      .select({
        id: bitacora.id,
        accion: bitacora.accion,
        resultado: bitacora.resultado,
        mensajeError: bitacora.mensajeError,
        fechaHora: bitacora.fechaHora,
        tabla: bitacora.tablaAfectada,
      })
      .from(bitacora)
      .where(not(eq(bitacora.resultado, "exitoso")))
      .orderBy(desc(bitacora.fechaHora))
      .limit(15);

    const serializedData = JSON.parse(
      JSON.stringify(data, (key, value) => (typeof value === "bigint" ? value.toString() : value)),
    );

    return NextResponse.json({ success: true, data: serializedData });
  } catch (error) {
    console.error("Error fetching system alerts:", error);
    return NextResponse.json({ success: false, error: "Error al cargar alertas del sistema" }, { status: 500 });
  }
}
