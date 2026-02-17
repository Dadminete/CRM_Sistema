import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const [updatedRole] = await db
      .update(roles)
      .set({
        ...body,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(roles.id, id))
      .returning();

    if (!updatedRole) {
      return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });
    }

    return NextResponse.json(
      JSON.parse(
        JSON.stringify({ success: true, role: updatedRole }, (key, value) =>
          typeof value === "bigint" ? value.toString() : value,
        ),
      ),
    );
  } catch (error: any) {
    console.error("Error updating role:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Note: In some systems roles deletion is restricted if users are assigned.
    // For now, simple deletion.
    await db.delete(roles).where(eq(roles.id, id));

    return NextResponse.json({ success: true, message: "Rol eliminado" });
  } catch (error: any) {
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
