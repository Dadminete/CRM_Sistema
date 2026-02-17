import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, invalidateSession, getUserBySession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  let sessionId: string | undefined;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (token) {
      // Verify and invalidate session
      const payload = verifyToken(token);
      if (payload) {
        sessionId = payload.sessionId;

        // Get user info before invalidating session
        const user = await getUserBySession(sessionId);
        if (user) {
          userId = user.id;
        }

        await invalidateSession(sessionId);

        // Log successful logout
        await logAudit({
          usuarioId: userId,
          sesionId: sessionId,
          accion: "LOGOUT",
          resultado: "exitoso",
          duracionMs: Date.now() - startTime,
          req,
        });
      }
    }

    // Clear cookie
    cookieStore.delete("auth-token");

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error: any) {
    console.error("Logout error:", error);
    await logAudit({
      usuarioId: userId,
      sesionId: sessionId,
      accion: "LOGOUT",
      resultado: "fallido",
      mensajeError: error.message,
      duracionMs: Date.now() - startTime,
      req,
    });
    return NextResponse.json({ success: false, error: "An error occurred during logout" }, { status: 500 });
  }
}
