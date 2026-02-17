import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, errorResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";

interface RouteParams {
  params: {
    id: string;
  };
}

// DELETE /api/profile/sessions/[id] - Close a specific session
export const DELETE = withAuth(async (req: NextRequest, { user }, context?: RouteParams) => {
  try {
    const sessionId = context?.params?.id;

    if (!sessionId) {
      return errorResponse("ID de sesión requerido", 400);
    }

    // Only allow users to close their own sessions
    const result = await db.execute(sql`
        UPDATE sesiones_usuario
        SET activa = false
        WHERE id = ${sessionId} AND usuario_id = ${user.id}
        RETURNING id
      `);

    if (result.rows.length === 0) {
      return errorResponse("Sesión no encontrada", 404);
    }

    return successResponse({
      message: "Sesión cerrada exitosamente",
    });
  } catch (error: any) {
    console.error("Error closing session:", error);
    return CommonErrors.internalError("Error al cerrar sesión");
  }
});
