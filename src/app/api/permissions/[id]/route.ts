import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { permisos } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const [updatedPermission] = await db
      .update(permisos)
      .set({
        ...body,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(permisos.id, id))
      .returning();

    if (!updatedPermission) {
      return NextResponse.json({ error: "Permiso no encontrado" }, { status: 404 });
    }

    return NextResponse.json(
      JSON.parse(
        JSON.stringify({ success: true, permission: updatedPermission }, (key, value) =>
          typeof value === "bigint" ? value.toString() : value,
        ),
      ),
    );
  } catch (error: any) {
    console.error("Error updating permission:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check if it's a system permission
    const [permiso] = await db.select().from(permisos).where(eq(permisos.id, id));
    if (permiso?.esSistema) {
      return NextResponse.json({ error: "No se pueden eliminar permisos del sistema" }, { status: 403 });
    }

    await db.delete(permisos).where(eq(permisos.id, id));

    return NextResponse.json({ success: true, message: "Permiso eliminado" });
  } catch (error: any) {
    console.error("Error deleting permission:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
