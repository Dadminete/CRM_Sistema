import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, errorResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// PATCH /api/profile/password - Change user password
export const PATCH = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return errorResponse("Se requiere la contraseña actual y la nueva contraseña", 400);
    }

    if (newPassword.length < 8) {
      return errorResponse("La nueva contraseña debe tener al menos 8 caracteres", 400);
    }

    // Get current user data
    const [currentUser] = await db.select().from(usuarios).where(eq(usuarios.id, user.id)).limit(1);

    if (!currentUser) {
      return errorResponse("Usuario no encontrado", 404);
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, currentUser.passwordHash);

    if (!isValidPassword) {
      await logAudit({
        usuarioId: user.id,
        sesionId: user.sessionId,
        accion: "UPDATE",
        tablaAfectada: "usuarios",
        resultado: "fallido",
        mensajeError: "Contraseña actual incorrecta",
        req,
      });

      return errorResponse("La contraseña actual es incorrecta", 401);
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await db.update(usuarios).set({ passwordHash }).where(eq(usuarios.id, user.id));

    // Log successful password change
    await logAudit({
      usuarioId: user.id,
      sesionId: user.sessionId,
      accion: "UPDATE",
      tablaAfectada: "usuarios",
      registroAfectadoId: user.id,
      resultado: "exitoso",
      req,
    });

    return successResponse({
      message: "Contraseña actualizada exitosamente",
    });
  } catch (error: any) {
    console.error("Error changing password:", error);
    return CommonErrors.internalError("Error al cambiar contraseña");
  }
});
