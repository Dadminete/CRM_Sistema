import { NextRequest } from "next/server";
import { asc, desc, eq, sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, errorResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { planes, categorias } from "@/lib/db/schema";
import { getPaginationParams, getPaginationOffset, getTotalCount, createPaginatedData } from "@/lib/pagination";
import { validateRequest } from "@/lib/validation";
import { createPlanSchema } from "@/schemas/plan.schema";

/**
 * GET /api/planes
 * Obtiene lista de planes con paginación
 */
export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const includeInactive = searchParams.get("includeInactive") === "true";
      
      // Get pagination parameters
      const { page, limit, sortBy, sortOrder } = getPaginationParams(req);
      const offset = getPaginationOffset(page, limit);

      // Apply sorting
      const orderColumn = sortBy === "nombre" 
        ? planes.nombre 
        : sortBy === "precio"
        ? planes.precio
        : sortBy === "orden"
        ? planes.orden
        : planes.createdAt;

      // Build query
      let query = db
        .select({
          id: planes.id,
          nombre: planes.nombre,
          descripcion: planes.descripcion,
          categoriaId: planes.categoriaId,
          categoriaNombre: categorias.nombre,
          precio: planes.precio,
          moneda: planes.moneda,
          subidaKbps: planes.subidaKbps,
          bajadaMbps: planes.bajadaMbps,
          detalles: planes.detalles,
          activo: planes.activo,
          orden: planes.orden,
          createdAt: planes.createdAt,
          updatedAt: planes.updatedAt,
        })
        .from(planes)
        .leftJoin(categorias, eq(planes.categoriaId, categorias.id))
        .where(includeInactive ? undefined : eq(planes.activo, true))
        .orderBy(sortOrder === "asc" ? asc(orderColumn) : desc(orderColumn))
        .limit(limit)
        .offset(offset);

      // Execute query
      const allPlanes = await query;

      // Get total count
      const total = await getTotalCount(planes, includeInactive ? undefined : eq(planes.activo, true));

      // Serialize BigInt values
      const serializedPlanes = JSON.parse(
        JSON.stringify(allPlanes, (key, value) => (typeof value === "bigint" ? value.toString() : value)),
      );

      return successResponse(createPaginatedData(serializedPlanes, page, limit, total));
    } catch (error: any) {
      console.error("Error fetching planes:", error);
      return CommonErrors.internalError("Error al obtener planes");
    }
  },
  { requiredPermission: "planes:leer" },
);

/**
 * POST /api/planes
 * Crea un nuevo plan
 */
export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json();

      // Validate request body
      const { data: validatedData, error } = await validateRequest(body, createPlanSchema);
      if (error || !validatedData) return error || CommonErrors.validationError("Datos inválidos");

      // Verificar que la categoría existe
      const categoria = await db
        .select()
        .from(categorias)
        .where(eq(categorias.id, validatedData.categoriaId))
        .limit(1);

      if (!categoria || categoria.length === 0) {
        return errorResponse("La categoría seleccionada no existe", 400);
      }

      // Crear el plan
      const [newPlan] = await db
        .insert(planes)
        .values({
          nombre: validatedData.nombre,
          descripcion: validatedData.descripcion,
          categoriaId: validatedData.categoriaId,
          precio: validatedData.precio.toString(),
          moneda: validatedData.moneda || "DOP",
          subidaKbps: validatedData.subidaKbps,
          bajadaMbps: validatedData.bajadaMbps,
          detalles: validatedData.detalles,
          activo: validatedData.activo ?? true,
          orden: validatedData.orden ?? 0,
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .returning();

      // Serialize response
      const serializedPlan = JSON.parse(
        JSON.stringify(newPlan, (key, value) => (typeof value === "bigint" ? value.toString() : value)),
      );

      return successResponse({ plan: serializedPlan, message: "Plan creado exitosamente" }, undefined, 201);
    } catch (error: any) {
      console.error("Error creating plan:", error);
      if (error.code === "23505") {
        return errorResponse("Ya existe un plan con ese nombre", 409);
      }
      return CommonErrors.internalError("Error al crear plan");
    }
  },
  { requiredPermission: "planes:crear" },
);
