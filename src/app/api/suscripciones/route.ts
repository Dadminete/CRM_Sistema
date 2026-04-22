import { NextRequest } from "next/server";

import { sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { db } from "@/lib/db";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Error desconocido";
}

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const search = searchParams.get("search")?.trim() ?? "";

      const searchFilter = search
        ? sql`AND (
            c.nombre ILIKE ${`%${search}%`}
            OR c.apellidos ILIKE ${`%${search}%`}
            OR c.codigo_cliente ILIKE ${`%${search}%`}
            OR s.numero_contrato ILIKE ${`%${search}%`}
          )`
        : sql``;

      const result = await db.execute(sql`
        SELECT
          s.id,
          s.numero_contrato,
          s.estado,
          s.precio_mensual,
          s.descuento_aplicado,
          s.fecha_inicio,
          s.fecha_vencimiento,
          s.fecha_proximo_pago,
          s.dia_facturacion,
          s.notas_instalacion,
          s.notas_servicio,
          s.cliente_id,
          s.servicio_id,
          s.plan_id,

          c.codigo_cliente,
          c.nombre AS cliente_nombre,
          c.apellidos AS cliente_apellidos,
          c.telefono AS cliente_telefono,
          c.email AS cliente_email,
          c.estado AS cliente_estado,

          srv.nombre AS servicio_nombre,
          srv.tipo AS servicio_tipo,

          p.nombre AS plan_nombre,
          p.subida_kbps,
          p.bajada_mbps,

          COUNT(e.id)::int AS equipos_count,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', e.id,
                'tipoEquipo', e.tipo_equipo,
                'marca', e.marca,
                'modelo', e.modelo,
                'numeroSerie', e.numero_serie,
                'macAddress', e.mac_address,
                'estado', e.estado,
                'suscripcionId', e.suscripcion_id,
                'clienteId', e.cliente_id
              )
            ) FILTER (WHERE e.id IS NOT NULL),
            '[]'::json
          ) AS equipos

        FROM suscripciones s
        INNER JOIN clientes c ON c.id = s.cliente_id
        LEFT JOIN servicios srv ON srv.id = s.servicio_id
        LEFT JOIN planes p ON p.id = s.plan_id
        LEFT JOIN equipos_cliente e
          ON e.cliente_id = s.cliente_id
          AND (e.suscripcion_id = s.id OR e.suscripcion_id IS NULL)

        WHERE s.estado = 'activo'
          AND c.estado = 'activo'
          ${searchFilter}

        GROUP BY
          s.id,
          c.codigo_cliente,
          c.nombre,
          c.apellidos,
          c.telefono,
          c.email,
          c.estado,
          srv.nombre,
          srv.tipo,
          p.nombre,
          p.subida_kbps,
          p.bajada_mbps

        ORDER BY c.nombre ASC, c.apellidos ASC
      `);

      return successResponse({
        suscripciones: result.rows,
        total: result.rows.length,
      });
    } catch (error: unknown) {
      console.error("Error al listar suscripciones activas:", error);
      return errorResponse(`Error al listar suscripciones activas: ${getErrorMessage(error)}`, 500);
    }
  },
  { requiredPermission: "clientes:leer" },
);
