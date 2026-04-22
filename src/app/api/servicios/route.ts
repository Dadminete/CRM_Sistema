import { NextRequest } from "next/server";

import { asc, desc, eq } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { servicios, categorias } from "@/lib/db/schema";
import { getPaginationOffset, getTotalCount, createPaginatedData } from "@/lib/pagination";

/**
 * GET /api/servicios
 * Lista servicios para seleccion comercial en alta de clientes.
 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const rawLimit = Number.parseInt(searchParams.get("limit") ?? "50", 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;
    const sortBy = searchParams.get("sortBy") ?? undefined;
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const offset = getPaginationOffset(page, limit);

    const orderColumn =
      sortBy === "nombre" ? servicios.nombre : sortBy === "precio" ? servicios.precioBase : servicios.createdAt;

    const rows = await db
      .select({
        id: servicios.id,
        nombre: servicios.nombre,
        descripcion: servicios.descripcion,
        descripcionCorta: servicios.descripcionCorta,
        categoriaId: servicios.categoriaId,
        categoriaNombre: categorias.nombre,
        tipo: servicios.tipo,
        esRecurrente: servicios.esRecurrente,
        requierePlan: servicios.requierePlan,
        precioBase: servicios.precioBase,
        moneda: servicios.moneda,
        activo: servicios.activo,
        destacado: servicios.destacado,
        orden: servicios.orden,
      })
      .from(servicios)
      .leftJoin(categorias, eq(servicios.categoriaId, categorias.id))
      .where(includeInactive ? undefined : eq(servicios.activo, true))
      .orderBy(sortOrder === "asc" ? asc(orderColumn) : desc(orderColumn))
      .limit(limit)
      .offset(offset);

    const total = await getTotalCount(servicios, includeInactive ? undefined : eq(servicios.activo, true));

    return successResponse(createPaginatedData(rows, page, limit, total));
  } catch (error: unknown) {
    console.error("Error fetching servicios:", error);
    return CommonErrors.internalError("Error al obtener servicios");
  }
});
