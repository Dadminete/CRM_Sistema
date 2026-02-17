import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { getPaginationParams, getPaginationOffset, createPaginatedData } from "@/lib/pagination";

// GET /api/notifications - Get user's notifications
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit } = getPaginationParams(req);
    const offset = getPaginationOffset(page, limit);

    const onlyUnread = searchParams.get("unread") === "true";

    // Build query
    let whereClause = `usuario_id = '${user.id}'`;
    if (onlyUnread) {
      whereClause += ` AND leida = false`;
    }

    // Get notifications
    const notifications = await db.execute(sql`
      SELECT 
        id, usuario_id, tipo, titulo, mensaje, enlace, metadata, 
        leida, fecha_creacion, fecha_leida
      FROM notificaciones
      WHERE ${sql.raw(whereClause)}
      ORDER BY fecha_creacion DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Get total count
    const [countResult] = await db.execute(sql`
      SELECT COUNT(*)::int as count
      FROM notificaciones
      WHERE ${sql.raw(whereClause)}
    `);

    const total = (countResult as any).count || 0;

    return successResponse(createPaginatedData(notifications.rows, page, limit, total));
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return CommonErrors.internalError("Error al obtener notificaciones");
  }
});

// POST /api/notifications/mark-all-read - Mark all notifications as read
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    await db.execute(sql`
      UPDATE notificaciones
      SET leida = true, fecha_leida = NOW()
      WHERE usuario_id = ${user.id} AND leida = false
    `);

    return successResponse({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (error: any) {
    console.error("Error marking all notifications as read:", error);
    return CommonErrors.internalError("Error al marcar notificaciones como leídas");
  }
});
