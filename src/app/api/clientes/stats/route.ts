import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      // Trigger rebuild
      // Single query to get all stats based on suscripciones table
      const result = await db.execute(sql`
        SELECT
          (SELECT COUNT(*)::int FROM clientes) AS total,
          (
            SELECT COUNT(DISTINCT c.id)::int 
            FROM clientes c 
            LEFT JOIN suscripciones s ON c.id = s.cliente_id 
            WHERE s.estado = 'activo' OR c.estado = 'activo'
          ) AS active,
          (
            SELECT COUNT(DISTINCT c.id)::int
            FROM clientes c
            WHERE NOT EXISTS (
              SELECT 1 FROM suscripciones s
              WHERE s.cliente_id = c.id AND s.estado = 'activo'
            ) AND c.estado != 'activo'
          ) AS inactive
      `);

      const row = result.rows?.[0] ?? result[0];

      return successResponse({
        total: (row as any)?.total ?? 0,
        active: (row as any)?.active ?? 0,
        inactive: (row as any)?.inactive ?? 0,
      });
    } catch (error: any) {
      console.error("Error fetching client stats:", error);
      return CommonErrors.internalError("Error al obtener estadísticas: " + error.message);
    }
  },
  { requiredPermission: "clientes:leer" },
);
