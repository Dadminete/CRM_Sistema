import { NextRequest, NextResponse } from "next/server";
import { asc, eq, sql, desc } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, errorResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { getPaginationParams, getPaginationOffset, getTotalCount, createPaginatedData } from "@/lib/pagination";

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      // Get pagination parameters
      const { page, limit, sortBy, sortOrder } = getPaginationParams(req);
      const offset = getPaginationOffset(page, limit);

      // Get total count
      const total = await getTotalCount(roles);

      // Fetch paginated roles ordered by name
      const allRoles = await db
        .select()
        .from(roles)
        .limit(limit)
        .offset(offset)
        .orderBy(sortOrder === "asc" ? asc(roles.nombreRol) : desc(roles.nombreRol));

      const serializedRoles = JSON.parse(
        JSON.stringify(allRoles, (key, value) => (typeof value === "bigint" ? value.toString() : value)),
      );

      return successResponse(createPaginatedData(serializedRoles, page, limit, total));
    } catch (error: any) {
      console.error("Error fetching roles:", error);
      return CommonErrors.internalError("Error al obtener roles");
    }
  },
  { requiredPermission: "roles:leer" },
);

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json();
      const { nombreRol, descripcion } = body;

      if (!nombreRol) {
        return errorResponse("El nombre del rol es obligatorio", 400);
      }

      const [newRole] = await db
        .insert(roles)
        .values({
          nombreRol,
          descripcion,
          activo: true,
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .returning();

      return successResponse(
        {
          role: JSON.parse(
            JSON.stringify(newRole, (key, value) => (typeof value === "bigint" ? value.toString() : value)),
          ),
        },
        undefined,
        201,
      );
    } catch (error: any) {
      console.error("Error creating role:", error);
      if (error.code === "23505") {
        return errorResponse("El nombre del rol ya existe", 409);
      }
      return CommonErrors.internalError("Error al crear rol");
    }
  },
  { requiredPermission: "roles:crear" },
);
