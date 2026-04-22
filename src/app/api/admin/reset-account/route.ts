import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

// Endpoint temporal para resetear cuenta bloqueada y contraseña
// NOTA: Eliminar después de usar
export const POST = async (req: NextRequest) => {
  try {
    // Verificación de seguridad (usar bearer token o variable de entorno)
    const authHeader = req.headers.get("authorization");
    const adminToken = process.env.ADMIN_RESET_TOKEN || "reset-alba-2026";

    if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username, resetPassword } = await req.json();

    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    console.log(`🔄 Resetting account for user: ${username}, resetPassword: ${resetPassword}`);

    // Get current user
    const [user] = await db.select().from(usuarios).where(eq(usuarios.username, username)).limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log(`✅ Found user ${username} - Failed attempts: ${user.intentosFallidos}, Blocked until: ${user.bloqueadoHasta}`);

    // Build update object
    const updates: any = {
      intentosFallidos: 0,
      bloqueadoHasta: null,
    };

    // If resetPassword is true, set a temporary password
    let tempPassword = null;
    if (resetPassword === true) {
      tempPassword = `TempPass${Math.random().toString(36).substring(2, 10)}!A`;
      updates.passwordHash = await hashPassword(tempPassword);
      console.log(`🔐 Temporary password generated: ${tempPassword}`);
    }

    // Reset account
    const updated = await db
      .update(usuarios)
      .set(updates)
      .where(eq(usuarios.id, user.id))
      .returning();

    console.log(
      `✅ Account reset: Failed attempts = ${updated[0].intentosFallidos}, Blocked until = ${updated[0].bloqueadoHasta}${tempPassword ? ", Password reset" : ""}`,
    );

    return NextResponse.json({
      success: true,
      message: `Account reset for user ${username}`,
      temporaryPassword: tempPassword,
      user: {
        username: updated[0].username,
        intentosFallidos: updated[0].intentosFallidos,
        bloqueadoHasta: updated[0].bloqueadoHasta,
      },
    });
  } catch (error) {
    console.error("❌ Reset error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
