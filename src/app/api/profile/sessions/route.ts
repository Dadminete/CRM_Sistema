import { NextRequest } from "next/server";
import { sql, eq } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";

// GET /api/profile/sessions - Get user's active sessions
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const sessions = await db.execute<{
      id: string;
      ip_address: string | null;
      user_agent: string | null;
      ultima_actividad: string;
      creado_en: string;
    }>(sql`
      SELECT id, ip_address, user_agent, ultima_actividad, creado_en
      FROM sesiones_usuario
      WHERE usuario_id = ${user.id} AND activa = true
      ORDER BY ultima_actividad DESC
    `);

    return successResponse({ sessions: sessions.rows });
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    return CommonErrors.internalError("Error al obtener sesiones");
  }
});
