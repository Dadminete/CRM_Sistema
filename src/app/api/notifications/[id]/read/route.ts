import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, errorResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";

// PATCH /api/notifications/[id]/read - Mark notification as read
export const PATCH = withAuth(async (req: NextRequest, { user, params }: any) => {
  try {
    const notificationId = params?.id;

    if (!notificationId) {
      return errorResponse("ID de notificación requerido", 400);
    }

    // Update notification (only if it belongs to the user)
    const result = await db.execute(sql`
        UPDATE notificaciones
        SET leida = true, fecha_leida = NOW()
        WHERE id = ${notificationId}::uuid 
          AND usuario_id = ${user.id}
          AND leida = false
        RETURNING id
      `);

    if (result.rows.length === 0) {
      return errorResponse("Notificación no encontrada o ya leída", 404);
    }

    return successResponse({ message: "Notificación marcada como leída" });
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    return CommonErrors.internalError("Error al marcar notificación como leída");
  }
});
