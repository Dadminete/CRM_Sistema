import { NextRequest, NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { categorias } from "@/lib/db/schema";

/**
 * GET /api/categorias
 * Obtiene lista de categorías activas
 */
export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const { searchParams } = new URL(req.url);
      const includeInactive = searchParams.get("includeInactive") === "true";

      // Build query
      let query = db.select().from(categorias);

      // Filter by active status if needed
      if (!includeInactive) {
        query = query.where(eq(categorias.activo, true));
      }

      // Order by orden and then by nombre
      query = query.orderBy(asc(categorias.orden), asc(categorias.nombre));

      // Execute query
      const allCategorias = await query;

      return successResponse({ categorias: allCategorias });
    } catch (error: any) {
      console.error("Error fetching categorias:", error);
      return CommonErrors.internalError("Error al obtener categorías");
    }
  },
  { requiredPermission: "planes:leer" },
);
