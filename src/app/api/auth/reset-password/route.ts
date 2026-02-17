import { NextRequest } from "next/server";
import { sql, eq } from "drizzle-orm";

import { successResponse, errorResponse, CommonErrors } from "@/lib/api-response";
import { withRateLimit, RateLimits } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth";

/**
 * POST /api/auth/reset-password
 * Reset password using a valid token
 *
 * Body: { token: string, password: string }
 */
export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return errorResponse("Token y contraseña son requeridos", 400);
    }

    if (password.length < 8) {
      return errorResponse("La contraseña debe tener al menos 8 caracteres", 400);
    }

    // Find valid token
    const [resetToken] = await db.execute<{
      id: string;
      usuario_id: string;
      expira_en: string;
      usado: boolean;
    }>(sql`
        SELECT id, usuario_id, expira_en, usado
        FROM password_reset_tokens
        WHERE token = ${token}
        LIMIT 1
      `);

    if (!resetToken) {
      return errorResponse("Token inválido o expirado", 400);
    }

    // Check if token has been used
    if (resetToken.usado) {
      return errorResponse("Este token ya ha sido utilizado", 400);
    }

    // Check if token has expired
    const expiresAt = new Date(resetToken.expira_en);
    if (expiresAt < new Date()) {
      return errorResponse("El token ha expirado. Solicita uno nuevo.", 400);
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update password and mark token as used
    await db.transaction(async (tx) => {
      // Update user password
      await tx
        .update(usuarios)
        .set({
          passwordHash,
          intentosFallidos: 0,
          bloqueadoHasta: null,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(usuarios.id, resetToken.usuario_id));

      // Mark token as used
      await tx.execute(sql`
          UPDATE password_reset_tokens
          SET usado = true, usado_en = NOW()
          WHERE id = ${resetToken.id}
        `);

      // Invalidate all other tokens for this user
      await tx.execute(sql`
          UPDATE password_reset_tokens
          SET usado = true
          WHERE usuario_id = ${resetToken.usuario_id} AND usado = false AND id != ${resetToken.id}
        `);
    });

    return successResponse({
      message: "Contraseña restablecida exitosamente. Ahora puedes iniciar sesión.",
    });
  } catch (error: any) {
    console.error("Error in reset password:", error);
    return CommonErrors.internalError("Error al restablecer contraseña");
  }
}, RateLimits.auth);
