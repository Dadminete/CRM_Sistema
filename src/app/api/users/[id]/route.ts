import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usuarios, usuariosRoles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { rolId, password, ...userData } = body;

    // Si el password viene, lo hasheamos y actualizamos passwordHash
    const dataToUpdate: any = {};
    
    // Solo incluir campos que tengan valor
    Object.entries(userData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        dataToUpdate[key] = value;
      }
    });
    
    if (password && password.trim() !== "") {
      // Hash the password before storing
      dataToUpdate.passwordHash = await hashPassword(password);
    }

    // 1. Update user data
    const [updatedUser] = await db
      .update(usuarios)
      .set({
        ...dataToUpdate,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(usuarios.id, id))
      .returning();

    if (!updatedUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // 2. Update role if provided
    if (rolId) {
      // Delete previous roles for this user (assuming one main role setup for now)
      await db.delete(usuariosRoles).where(eq(usuariosRoles.usuarioId, id));

      // Insert new role
      await db.insert(usuariosRoles).values({
        usuarioId: id,
        rolId: Number(rolId),
        activo: true,
        fechaAsignacion: sql`CURRENT_TIMESTAMP`,
      });
    }

    return NextResponse.json(
      JSON.parse(
        JSON.stringify({ success: true, user: updatedUser }, (key, value) =>
          typeof value === "bigint" ? value.toString() : value,
        ),
      ),
    );
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Optional: Logical delete instead of physical
    // await db.update(usuarios).set({ activo: false }).where(eq(usuarios.id, id));

    await db.delete(usuarios).where(eq(usuarios.id, id));

    return NextResponse.json({ success: true, message: "Usuario eliminado" });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
