import { NextRequest, NextResponse } from "next/server";
import { asc, eq, sql, desc } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, errorResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { permisos } from "@/lib/db/schema";
import { getPaginationParams, getPaginationOffset, getTotalCount, createPaginatedData } from "@/lib/pagination";

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      // Get pagination parameters
      const { page, limit, sortBy, sortOrder } = getPaginationParams(req);
      const offset = getPaginationOffset(page, limit);

      // Get total count
      const total = await getTotalCount(permisos);

      // Fetch paginated permissions
      const allPermissions = await db
        .select()
        .from(permisos)
        .limit(limit)
        .offset(offset)
        .orderBy(
          sortBy === "categoria"
            ? sortOrder === "asc"
              ? asc(permisos.categoria)
              : desc(permisos.categoria)
            : sortOrder === "asc"
              ? asc(permisos.nombrePermiso)
              : desc(permisos.nombrePermiso),
        );

      const serializedPermissions = JSON.parse(
        JSON.stringify(allPermissions, (key, value) => (typeof value === "bigint" ? value.toString() : value)),
      );

      return successResponse(createPaginatedData(serializedPermissions, page, limit, total));
    } catch (error: any) {
      console.error("Error fetching permissions:", error);
      return CommonErrors.internalError("Error al obtener permisos");
    }
  },
  { requiredPermission: "permisos:leer" },
);

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json();
      const { nombrePermiso, descripcion, categoria, activo, esSistema } = body;

      if (!nombrePermiso) {
        return errorResponse("El nombre del permiso es obligatorio", 400);
      }

      const [newPermission] = await db
        .insert(permisos)
        .values({
          nombrePermiso,
          descripcion,
          categoria: categoria || "general",
          activo: activo ?? true,
          esSistema: esSistema ?? false,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .returning();

      return successResponse(
        {
          permission: JSON.parse(
            JSON.stringify(newPermission, (key, value) => (typeof value === "bigint" ? value.toString() : value)),
          ),
        },
        undefined,
        201,
      );
    } catch (error: any) {
      console.error("Error creating permission:", error);
      if (error.code === "23505") {
        return errorResponse("El nombre del permiso ya existe", 409);
      }
      return CommonErrors.internalError("Error al crear permiso");
    }
  },
  { requiredPermission: "permisos:crear" },
);
