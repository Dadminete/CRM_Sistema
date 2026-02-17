import { NextRequest } from "next/server";
import { sql, eq } from "drizzle-orm";
import crypto from "crypto";

import { successResponse, errorResponse, CommonErrors } from "@/lib/api-response";
import { withRateLimit, RateLimits } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";

/**
 * POST /api/auth/forgot-password
 * Generate a password reset token and send it via email
 *
 * Body: { email: string }
 */
export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return errorResponse("El email es requerido", 400);
    }

    // Find user by email
    const [user] = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1);

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user && user.activo) {
      // Generate secure random token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

      // Get IP and User Agent
      const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? null;
      const userAgent = req.headers.get("user-agent") ?? null;

      // Store token in database
      await db.execute(sql`
          INSERT INTO password_reset_tokens (usuario_id, token, expira_en, ip_address, user_agent)
          VALUES (${user.id}, ${token}, ${expiresAt.toISOString()}, ${ipAddress}, ${userAgent})
        `);

      // TODO: Send email with reset link
      // For now, we'll return the token in development mode only
      // In production, this should be removed and email should be sent

      const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

      if (process.env.NODE_ENV === "development") {
        console.log("🔑 Password reset token:", token);
        console.log("🔗 Reset link:", resetLink);

        // Return the token only in development
        return successResponse({
          message: "Se ha enviado un enlace de recuperación a tu email",
          // Only in development:
          debug: {
            token,
            resetLink,
            expiresAt: expiresAt.toISOString(),
          },
        });
      }

      // TODO: Implement email sending
      // Example with nodemailer:
      // await sendEmail({
      //   to: email,
      //   subject: "Recuperación de Contraseña",
      //   html: `
      //     <p>Hola ${user.nombre},</p>
      //     <p>Has solicitado recuperar tu contraseña.</p>
      //     <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
      //     <a href="${resetLink}">${resetLink}</a>
      //     <p>Este enlace expirará en 1 hora.</p>
      //     <p>Si no solicitaste este cambio, ignora este mensaje.</p>
      //   `,
      // });
    }

    // Always return success message
    return successResponse({
      message: "Si el email existe en nuestro sistema, recibirás un enlace de recuperación",
    });
  } catch (error: any) {
    console.error("Error in forgot password:", error);
    return CommonErrors.internalError("Error al procesar solicitud de recuperación");
  }
}, RateLimits.auth);
