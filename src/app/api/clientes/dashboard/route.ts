import { NextRequest } from "next/server";

import { sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { db } from "@/lib/db";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Error desconocido";
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function deriveNextBillingDate(fechaProximoPago: unknown, diaFacturacion: unknown): string {
  const directDate = String(fechaProximoPago ?? "").trim();
  if (directDate.length >= 10) {
    return directDate.slice(0, 10);
  }

  const day = toNumber(diaFacturacion);
  if (day <= 0) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = today.getFullYear();
  const month = today.getMonth();
  const safeDayCurrent = Math.min(day, getLastDayOfMonth(year, month));
  const candidate = new Date(year, month, safeDayCurrent);

  if (candidate >= today) {
    return toIsoDate(candidate);
  }

  const nextMonthDate = new Date(year, month + 1, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth();
  const safeDayNext = Math.min(day, getLastDayOfMonth(nextYear, nextMonth));
  return toIsoDate(new Date(nextYear, nextMonth, safeDayNext));
}

export const GET = withAuth(
  async (_req: NextRequest) => {
    try {
      const overviewResult = await db.execute(sql`
        SELECT
          (SELECT COUNT(*)::int FROM clientes) AS total_clientes,
          (
            SELECT COUNT(*)::int 
            FROM clientes 
            WHERE LOWER(estado) = 'activo'
          ) AS clientes_activos,
          (
            SELECT COUNT(*)::int
            FROM clientes c
            WHERE NOT EXISTS (
              SELECT 1 FROM suscripciones s 
              WHERE s.cliente_id = c.id AND LOWER(s.estado) = 'activo'
            )
          ) AS clientes_sin_suscripcion_activa,
          (
            SELECT COUNT(*)::int 
            FROM suscripciones 
            WHERE LOWER(estado) = 'activo'
          ) AS suscripciones_activas,
          (
            SELECT COALESCE(SUM(CAST(s.precio_mensual AS DECIMAL)), 0)
            FROM suscripciones s
            INNER JOIN clientes c ON s.cliente_id = c.id
            WHERE LOWER(c.estado) = 'activo' AND LOWER(s.estado) = 'activo'
          ) AS ingreso_mensual_estimado,
          (SELECT COUNT(*)::int FROM equipos_cliente) AS equipos_registrados
      `);

      const serviciosResult = await db.execute(sql`
        SELECT
          COALESCE(srv.nombre, 'Sin servicio') AS servicio,
          COUNT(*)::int AS total
        FROM suscripciones s
        INNER JOIN clientes c ON s.cliente_id = c.id
        LEFT JOIN servicios srv ON srv.id = s.servicio_id
        WHERE LOWER(c.estado) = 'activo'
        GROUP BY COALESCE(srv.nombre, 'Sin servicio')
        ORDER BY total DESC, servicio ASC
        LIMIT 8
      `);

      const planesResult = await db.execute(sql`
        SELECT
          COALESCE(p.nombre, 'Sin plan') AS plan,
          COUNT(*)::int AS total
        FROM suscripciones s
        INNER JOIN clientes c ON s.cliente_id = c.id
        LEFT JOIN planes p ON p.id = s.plan_id
        WHERE LOWER(c.estado) = 'activo'
        GROUP BY COALESCE(p.nombre, 'Sin plan')
        ORDER BY total DESC, plan ASC
        LIMIT 8
      `);

      const estadoClientesResult = await db.execute(sql`
        SELECT
          COALESCE(LOWER(NULLIF(TRIM(c.estado), '')), 'sin_estado') AS estado,
          COUNT(*)::int AS total
        FROM clientes c
        GROUP BY COALESCE(LOWER(NULLIF(TRIM(c.estado), '')), 'sin_estado')
        ORDER BY total DESC, estado ASC
      `);

      const proximosPagosResult = await db.execute(sql`
        SELECT
          s.id,
          s.numero_contrato,
          s.fecha_proximo_pago,
          s.dia_facturacion,
          s.precio_mensual,
          c.codigo_cliente,
          c.estado AS cliente_estado,
          c.nombre,
          c.apellidos
        FROM suscripciones s
        INNER JOIN clientes c ON c.id = s.cliente_id
        WHERE LOWER(c.estado) = 'activo'
        ORDER BY c.nombre ASC, c.apellidos ASC
        LIMIT 400
      `);

      const topEquiposResult = await db.execute(sql`
        SELECT
          c.id,
          c.codigo_cliente,
          c.estado AS cliente_estado,
          c.nombre,
          c.apellidos,
          COUNT(e.id)::int AS equipos
        FROM clientes c
        LEFT JOIN equipos_cliente e ON e.cliente_id = c.id
        GROUP BY c.id, c.codigo_cliente, c.estado, c.nombre, c.apellidos
        ORDER BY equipos DESC, c.nombre ASC, c.apellidos ASC
        LIMIT 10
      `);

      const overviewRow = overviewResult.rows[0] as Record<string, unknown> | undefined;

      const mappedProximosPagos = proximosPagosResult.rows
        .map((item) => {
          const fecha = deriveNextBillingDate(item.fecha_proximo_pago, item.dia_facturacion);
          return {
            id: String(item.id ?? ""),
            numeroContrato: String(item.numero_contrato ?? ""),
            fechaProximoPago: fecha,
            precioMensual: toNumber(item.precio_mensual),
            codigoCliente: String(item.codigo_cliente ?? ""),
            clienteEstado: String(item.cliente_estado ?? "sin_estado").toLowerCase(),
            clienteNombre: `${String(item.nombre ?? "")} ${String(item.apellidos ?? "")}`.trim(),
          };
        })
        .filter((item) => item.fechaProximoPago.length > 0)
        .sort((a, b) => a.fechaProximoPago.localeCompare(b.fechaProximoPago))
        .slice(0, 10);

      const data = {
        overview: {
          totalClientes: toNumber(overviewRow?.total_clientes),
          clientesActivos: toNumber(overviewRow?.clientes_activos),
          clientesSinSuscripcionActiva: toNumber(overviewRow?.clientes_sin_suscripcion_activa),
          suscripcionesActivas: toNumber(overviewRow?.suscripciones_activas),
          ingresoMensualEstimado: toNumber(overviewRow?.ingreso_mensual_estimado),
          equiposRegistrados: toNumber(overviewRow?.equipos_registrados),
        },
        distribucionServicios: serviciosResult.rows.map((item) => {
          return {
            servicio: String(item.servicio ?? "Sin servicio"),
            total: toNumber(item.total),
          };
        }),
        distribucionPlanes: planesResult.rows.map((item) => {
          return {
            plan: String(item.plan ?? "Sin plan"),
            total: toNumber(item.total),
          };
        }),
        estadoClientes: estadoClientesResult.rows.map((item) => {
          return {
            estado: String(item.estado ?? "sin_estado"),
            total: toNumber(item.total),
          };
        }),
        proximosPagos: mappedProximosPagos,
        topClientesEquipos: topEquiposResult.rows.map((item) => {
          return {
            id: String(item.id ?? ""),
            codigoCliente: String(item.codigo_cliente ?? ""),
            clienteEstado: String(item.cliente_estado ?? "sin_estado").toLowerCase(),
            clienteNombre: `${String(item.nombre ?? "")} ${String(item.apellidos ?? "")}`.trim(),
            equipos: toNumber(item.equipos),
          };
        }),
      };

      return successResponse(data);
    } catch (error: unknown) {
      console.error("Error en dashboard de clientes:", error);
      return errorResponse(`Error al cargar dashboard de clientes: ${getErrorMessage(error)}`, 500);
    }
  },
  { requiredPermission: "clientes:leer" },
);
