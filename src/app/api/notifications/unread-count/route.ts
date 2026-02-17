import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse } from "@/lib/api-response";
import { db } from "@/lib/db";

// GET /api/notifications/unread-count - Get count of unread notifications
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const [result] = await db.execute(sql`
      SELECT COUNT(*)::int as count
      FROM notificaciones
      WHERE usuario_id = ${user.id} AND leida = false
    `);

    const count = (result as any)?.count || 0;

    return successResponse({ count });
  } catch (error: any) {
    // Silently handle table not exists error
    if (error.message?.includes('does not exist') || error.cause?.code === '42P01') {
      return successResponse({ count: 0 });
    }
    console.error("Error getting unread count:", error);
    return successResponse({ count: 0 }); // Fail gracefully
  }
});
