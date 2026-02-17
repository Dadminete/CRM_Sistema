import { NextRequest } from "next/server";
import { and, desc, gte, lte, eq, or, ilike, sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { bitacora, usuarios } from "@/lib/db/schema";
import { getPaginationParams, getPaginationOffset, createPaginatedData } from "@/lib/pagination";

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const { page, limit, sortOrder } = getPaginationParams(req);
      const offset = getPaginationOffset(page, limit);

      // Filters
      const usuarioId = searchParams.get("usuarioId");
      const accion = searchParams.get("accion");
      const tablaAfectada = searchParams.get("tablaAfectada");
      const resultado = searchParams.get("resultado");
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const search = searchParams.get("search");

      // Build where conditions
      const conditions = [];

      if (usuarioId) {
        conditions.push(eq(bitacora.usuarioId, usuarioId));
      }

      if (accion) {
        conditions.push(eq(bitacora.accion, accion));
      }

      if (tablaAfectada) {
        conditions.push(eq(bitacora.tablaAfectada, tablaAfectada));
      }

      if (resultado) {
        conditions.push(eq(bitacora.resultado, resultado));
      }

      if (startDate) {
        conditions.push(gte(bitacora.fechaHora, startDate));
      }

      if (endDate) {
        conditions.push(lte(bitacora.fechaHora, endDate));
      }

      if (search) {
        conditions.push(
          or(
            ilike(bitacora.accion, `%${search}%`),
            ilike(bitacora.tablaAfectada, `%${search}%`),
            ilike(bitacora.metodo, `%${search}%`),
            ilike(bitacora.ruta, `%${search}%`),
          ),
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Query with pagination
      const logs = await db
        .select({
          id: bitacora.id,
          usuarioId: bitacora.usuarioId,
          usuario: sql<string>`${usuarios.nombre} || ' ' || ${usuarios.apellido}`,
          usuarioUsername: usuarios.username,
          sesionId: bitacora.sesionId,
          accion: bitacora.accion,
          tablaAfectada: bitacora.tablaAfectada,
          registroAfectadoId: bitacora.registroAfectadoId,
          detallesAnteriores: bitacora.detallesAnteriores,
          detallesNuevos: bitacora.detallesNuevos,
          ipAddress: bitacora.ipAddress,
          userAgent: bitacora.userAgent,
          metodo: bitacora.metodo,
          ruta: bitacora.ruta,
          resultado: bitacora.resultado,
          mensajeError: bitacora.mensajeError,
          duracionMs: bitacora.duracionMs,
          fechaHora: bitacora.fechaHora,
        })
        .from(bitacora)
        .leftJoin(usuarios, eq(bitacora.usuarioId, usuarios.id))
        .where(whereClause)
        .orderBy(sortOrder === "asc" ? bitacora.fechaHora : desc(bitacora.fechaHora))
        .limit(limit)
        .offset(offset);

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(bitacora)
        .where(whereClause);

      return successResponse(createPaginatedData(logs, page, limit, Number(count)));
    } catch (error: any) {
      console.error("Error fetching audit logs:", error);
      return CommonErrors.internalError("Error al obtener registros de auditoría");
    }
  },
  { requiredPermission: "auditoria:leer" },
);
