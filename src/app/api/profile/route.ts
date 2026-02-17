import { NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, errorResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { logDataChange } from "@/lib/audit";

// GET /api/profile - Get current user profile
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const [profile] = await db
      .select({
        id: usuarios.id,
        username: usuarios.username,
        nombre: usuarios.nombre,
        apellido: usuarios.apellido,
        email: usuarios.email,
        telefono: usuarios.telefono,
        cedula: usuarios.cedula,
        direccion: usuarios.direccion,
        fechaNacimiento: usuarios.fechaNacimiento,
        sexo: usuarios.sexo,
        avatar: usuarios.avatar,
        activo: usuarios.activo,
        esEmpleado: usuarios.esEmpleado,
        esCliente: usuarios.esCliente,
        createdAt: usuarios.createdAt,
        ultimoAcceso: usuarios.ultimoAcceso,
      })
      .from(usuarios)
      .where(eq(usuarios.id, user.id))
      .limit(1);

    if (!profile) {
      return errorResponse("Usuario no encontrado", 404);
    }

    return successResponse({ profile });
  } catch (error: any) {
    console.error("Error fetching profile:", error);
    return CommonErrors.internalError("Error al obtener perfil");
  }
});

// PATCH /api/profile - Update user profile
export const PATCH = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();
    const { nombre, apellido, email, telefono, direccion, fechaNacimiento, sexo } = body;

    // Get current data for audit
    const [currentData] = await db.select().from(usuarios).where(eq(usuarios.id, user.id)).limit(1);

    // Update profile
    const [updatedProfile] = await db
      .update(usuarios)
      .set({
        nombre: nombre || currentData.nombre,
        apellido: apellido || currentData.apellido,
        email: email || currentData.email,
        telefono: telefono || currentData.telefono,
        direccion: direccion || currentData.direccion,
        fechaNacimiento: fechaNacimiento || currentData.fechaNacimiento,
        sexo: sexo || currentData.sexo,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(usuarios.id, user.id))
      .returning();

    // Log the change
    await logDataChange(
      user.id,
      "UPDATE",
      "usuarios",
      user.id,
      {
        nombre: currentData.nombre,
        apellido: currentData.apellido,
        email: currentData.email,
        telefono: currentData.telefono,
      },
      {
        nombre: updatedProfile.nombre,
        apellido: updatedProfile.apellido,
        email: updatedProfile.email,
        telefono: updatedProfile.telefono,
      },
      req,
    );

    return successResponse({ profile: updatedProfile });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    if (error.code === "23505") {
      return errorResponse("El email ya está en uso", 409);
    }
    return CommonErrors.internalError("Error al actualizar perfil");
  }
});
