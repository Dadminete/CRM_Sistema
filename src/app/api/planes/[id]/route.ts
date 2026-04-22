import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, errorResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { planes, categorias } from "@/lib/db/schema";
import { validateRequest } from "@/lib/validation";
import { updatePlanSchema } from "@/schemas/plan.schema";

/**
 * GET /api/planes/[id]
 * Obtiene un plan específico por ID
 */
export const GET = withAuth(
  async (req: NextRequest, { params, user }: { params: { id: string }; user: any }) => {
    try {
      const planId = BigInt(params.id);

      const [plan] = await db
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
        .where(eq(planes.id, planId))
        .limit(1);

      if (!plan) {
        return errorResponse("Plan no encontrado", 404);
      }

      // Serialize BigInt values
      const serializedPlan = JSON.parse(
        JSON.stringify(plan, (key, value) => (typeof value === "bigint" ? value.toString() : value)),
      );

      return successResponse({ plan: serializedPlan });
    } catch (error: any) {
      console.error("Error fetching plan:", error);
      return CommonErrors.internalError("Error al obtener plan");
    }
  },
  { requiredPermission: "planes:leer" },
);

/**
 * PUT /api/planes/[id]
 * Actualiza un plan existente
 */
export const PUT = withAuth(
  async (req: NextRequest, { params, user }: { params: { id: string }; user: any }) => {
    try {
      const planId = BigInt(params.id);
      const body = await req.json();

      // Validate request body
      const { data: validatedData, error } = await validateRequest(body, updatePlanSchema);
      if (error) return error;

      // Verificar que el plan existe
      const [existingPlan] = await db.select().from(planes).where(eq(planes.id, planId)).limit(1);

      if (!existingPlan) {
        return errorResponse("Plan no encontrado", 404);
      }

      // Si se está actualizando la categoría, verificar que existe
      if (validatedData.categoriaId) {
        const categoria = await db
          .select()
          .from(categorias)
          .where(eq(categorias.id, validatedData.categoriaId))
          .limit(1);

        if (!categoria || categoria.length === 0) {
          return errorResponse("La categoría seleccionada no existe", 400);
        }
      }

      // Preparar datos para actualización
      const updateData: any = {
        updatedAt: sql`CURRENT_TIMESTAMP`,
      };

      if (validatedData.nombre !== undefined) updateData.nombre = validatedData.nombre;
      if (validatedData.descripcion !== undefined) updateData.descripcion = validatedData.descripcion;
      if (validatedData.categoriaId !== undefined) updateData.categoriaId = validatedData.categoriaId;
      if (validatedData.precio !== undefined) updateData.precio = validatedData.precio.toString();
      if (validatedData.moneda !== undefined) updateData.moneda = validatedData.moneda;
      if (validatedData.subidaKbps !== undefined) updateData.subidaKbps = validatedData.subidaKbps;
      if (validatedData.bajadaMbps !== undefined) updateData.bajadaMbps = validatedData.bajadaMbps;
      if (validatedData.detalles !== undefined) updateData.detalles = validatedData.detalles;
      if (validatedData.activo !== undefined) updateData.activo = validatedData.activo;
      if (validatedData.orden !== undefined) updateData.orden = validatedData.orden;

      // Actualizar el plan
      const [updatedPlan] = await db.update(planes).set(updateData).where(eq(planes.id, planId)).returning();

      // Serialize response
      const serializedPlan = JSON.parse(
        JSON.stringify(updatedPlan, (key, value) => (typeof value === "bigint" ? value.toString() : value)),
      );

      return successResponse({ plan: serializedPlan }, "Plan actualizado exitosamente");
    } catch (error: any) {
      console.error("Error updating plan:", error);
      if (error.code === "23505") {
        return errorResponse("Ya existe un plan con ese nombre", 409);
      }
      return CommonErrors.internalError("Error al actualizar plan");
    }
  },
  { requiredPermission: "planes:editar" },
);

/**
 * DELETE /api/planes/[id]
 * Elimina un plan (soft delete)
 */
export const DELETE = withAuth(
  async (req: NextRequest, { params, user }: { params: { id: string }; user: any }) => {
    try {
      const planId = BigInt(params.id);

      // Verificar que el plan existe
      const [existingPlan] = await db.select().from(planes).where(eq(planes.id, planId)).limit(1);

      if (!existingPlan) {
        return errorResponse("Plan no encontrado", 404);
      }

      // Soft delete: marcar como inactivo
      await db
        .update(planes)
        .set({
          activo: false,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(planes.id, planId));

      return successResponse(null, "Plan eliminado exitosamente");
    } catch (error: any) {
      console.error("Error deleting plan:", error);
      return CommonErrors.internalError("Error al eliminar plan");
    }
  },
  { requiredPermission: "planes:eliminar" },
);
