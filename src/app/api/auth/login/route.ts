import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, createSession, generateToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { withRateLimit, RateLimits } from "@/lib/rate-limit";
import { successResponse, errorResponse } from "@/lib/api-response";
import { validateRequest } from "@/lib/validation";
import { loginSchema } from "@/schemas/user.schema";
import { logAudit } from "@/lib/audit";

export const POST = withRateLimit(async (req: NextRequest) => {
  const startTime = Date.now();
  let userId: string | undefined;
  let sessionId: string | undefined;

  try {
    const body = await req.json();

    // Validate input
    const { data: validatedData, error } = await validateRequest(body, loginSchema);
    if (error) {
      await logAudit({
        accion: "LOGIN",
        resultado: "fallido",
        mensajeError: "Datos de entrada inválidos",
        duracionMs: Date.now() - startTime,
        req,
      });
      return error;
    }

    const { username, password } = validatedData!;
    const remember = body.remember ?? false;

    console.log("🔐 Login attempt for username:", username);

    // Find user by username
    console.log("🔍 Searching for user:", username);
    const [user] = await db.select().from(usuarios).where(eq(usuarios.username, username)).limit(1);

    if (!user) {
      console.log("❌ User not found:", username);
      await logAudit({
        accion: "LOGIN",
        resultado: "fallido",
        mensajeError: "Usuario no encontrado",
        duracionMs: Date.now() - startTime,
        req,
      });
      return errorResponse("Usuario o contraseña inválidos", 401);
    }

    userId = user.id;
    console.log("✅ User found:", user.username, "- Active:", user.activo);

    // Check if user is active
    if (!user.activo) {
      console.log("❌ User is inactive");
      await logAudit({
        usuarioId: userId,
        accion: "LOGIN",
        resultado: "fallido",
        mensajeError: "Cuenta inactiva",
        duracionMs: Date.now() - startTime,
        req,
      });
      return errorResponse("Cuenta inactiva. Por favor, contacta al administrador.", 403);
    }

    // Check if user is blocked
    if (user.bloqueadoHasta) {
      const blockedUntil = new Date(user.bloqueadoHasta);
      if (blockedUntil > new Date()) {
        console.log("❌ User is temporarily blocked");
        await logAudit({
          usuarioId: userId,
          accion: "LOGIN",
          resultado: "fallido",
          mensajeError: "Cuenta bloqueada temporalmente",
          duracionMs: Date.now() - startTime,
          req,
        });
        return errorResponse(
          `Cuenta bloqueada temporalmente. Intenta de nuevo después de ${blockedUntil.toLocaleString()}.`,
          403,
        );
      }
    }

    // Verify password
    console.log("🔐 Verifying password...");
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    console.log("🔐 Password valid:", isValidPassword);

    if (!isValidPassword) {
      console.log("❌ Invalid password for user:", username);

      // Increment failed attempts
      const newFailedAttempts = (user.intentosFallidos || 0) + 1;
      const updates: any = {
        intentosFallidos: newFailedAttempts,
      };

      // Block account after 5 failed attempts
      if (newFailedAttempts >= 5) {
        const blockedUntil = new Date();
        blockedUntil.setMinutes(blockedUntil.getMinutes() + 30); // Block for 30 minutes
        updates.bloqueadoHasta = blockedUntil.toISOString();
        console.log("🚫 Account blocked due to too many failed attempts");
      }

      await db.update(usuarios).set(updates).where(eq(usuarios.id, user.id));

      await logAudit({
        usuarioId: userId,
        accion: "LOGIN",
        resultado: "fallido",
        mensajeError: "Contraseña inválida",
        duracionMs: Date.now() - startTime,
        req,
      });

      return errorResponse("Usuario o contraseña inválidos", 401);
    }

    // Get IP and User Agent
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    // Create session
    sessionId = await createSession(user.id, ipAddress, userAgent);

    // Generate JWT token
    const token = generateToken(user.id, sessionId);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // 30 days if remember, else 1 day
      path: "/",
    });

    // Update last access time and reset failed attempts
    await db
      .update(usuarios)
      .set({
        ultimoAcceso: new Date().toISOString(),
        intentosFallidos: 0,
        bloqueadoHasta: null,
      })
      .where(eq(usuarios.id, user.id));

    // Log successful login
    await logAudit({
      usuarioId: userId,
      sesionId: sessionId,
      accion: "LOGIN",
      resultado: "exitoso",
      duracionMs: Date.now() - startTime,
      req,
    });

    console.log("✅ Login successful for user:", username);

    // Return user data (excluding sensitive info)
    return successResponse({
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    await logAudit({
      usuarioId: userId,
      sesionId: sessionId,
      accion: "LOGIN",
      resultado: "fallido",
      mensajeError: error.message,
      duracionMs: Date.now() - startTime,
      req,
    });
    return errorResponse("Ocurrió un error durante el inicio de sesión", 500);
  }
}, RateLimits.auth);
