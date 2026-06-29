import { NextRequest, NextResponse } from "next/server";

import { sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { esFacturaAdelantada } from "./lib";
import { formatearPeriodoFacturado } from "@/app/api/facturas/lib/periodos";

type Row = {
  cliente_id: string;
  nombre: string;
  apellidos: string;
  mes: number | null;
  pagos: number | null;
  monto: string | null;
  estado_mes: string | null;
  observaciones: string | null;
  periodo_inicio: string | null;
};

function parseYear(value: string | null): number {
  const currentYear = new Date().getFullYear();
  if (!value) return currentYear;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) return currentYear;
  return parsed;
}

function parsePage(value: string | null): number {
  if (!value) return 1;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function parseLimit(value: string | null): number {
  if (!value) return 30;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return 30;
  return Math.min(200, Math.max(30, parsed));
}

function parseMonth(value: string | null): number | null {
  if (!value || value === "all") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12 ? parsed : null;
}

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
    const year = parseYear(req.nextUrl.searchParams.get("year"));
    const month = parseMonth(req.nextUrl.searchParams.get("month"));
    const page = parsePage(req.nextUrl.searchParams.get("page"));
    const limit = parseLimit(req.nextUrl.searchParams.get("limit"));
    const offset = (page - 1) * limit;
    const activeClientFilter = sql`LOWER(TRIM(COALESCE(c.estado, 'activo'))) = 'activo'`;
    const activeClientFilterC2 = sql`LOWER(TRIM(COALESCE(c2.estado, 'activo'))) = 'activo'`;

    const countResult = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total
      FROM clientes c
      WHERE ${activeClientFilter}
      AND EXISTS (
        SELECT 1
        FROM pagos_clientes p
        INNER JOIN facturas_clientes f ON f.id = p.factura_id
        WHERE p.cliente_id = c.id
          AND EXTRACT(YEAR FROM COALESCE(f.periodo_facturado_inicio, f.fecha_factura)) = ${year}
          AND LOWER(COALESCE(f.estado, '')) IN ('pago', 'pagado', 'pagada', 'parcial', 'adelantado', 'pago adelantado', 'adelantada')
          ${month ? sql`AND EXTRACT(MONTH FROM COALESCE(f.periodo_facturado_inicio, f.fecha_factura)) = ${month}` : sql``}
      )
      AND (
        ${search} = ''
        OR c.nombre ILIKE ${`%${search}%`}
        OR c.apellidos ILIKE ${`%${search}%`}
        OR c.codigo_cliente ILIKE ${`%${search}%`}
      )
    `);

    const total = Number(countResult.rows?.[0]?.total ?? 0);

    const rowsResult = await db.execute<Row>(sql`
      SELECT
        c.id AS cliente_id,
        c.nombre,
        c.apellidos,
        EXTRACT(MONTH FROM COALESCE(f.periodo_facturado_inicio, f.fecha_factura))::int AS mes,
        COUNT(p.id)::int AS pagos,
        COALESCE(SUM(COALESCE(p.monto, 0) + COALESCE(p.descuento, 0)), 0)::text AS monto,
        CASE
          WHEN COUNT(*) FILTER (WHERE LOWER(COALESCE(f.estado, '')) = 'parcial') > 0 THEN 'parcial'
          WHEN COUNT(*) FILTER (WHERE LOWER(COALESCE(f.estado, '')) IN ('pagada', 'pagado', 'pago', 'adelantado', 'pago adelantado', 'adelantada')) > 0 THEN 'pagado'
          ELSE 'ninguno'
        END AS estado_mes,
        MAX(COALESCE(f.observaciones, '')) AS observaciones,
        MIN(COALESCE(f.periodo_facturado_inicio, f.fecha_factura)) AS periodo_inicio
      FROM clientes c
      INNER JOIN pagos_clientes p
        ON p.cliente_id = c.id
      INNER JOIN facturas_clientes f
        ON f.id = p.factura_id
       AND EXTRACT(YEAR FROM COALESCE(f.periodo_facturado_inicio, f.fecha_factura)) = ${year}
       AND LOWER(COALESCE(f.estado, '')) IN ('pago', 'pagado', 'pagada', 'parcial', 'adelantado', 'pago adelantado', 'adelantada')
      WHERE (
        ${search} = ''
        OR c.nombre ILIKE ${`%${search}%`}
        OR c.apellidos ILIKE ${`%${search}%`}
        OR c.codigo_cliente ILIKE ${`%${search}%`}
      )
      AND ${activeClientFilter}
      AND c.id IN (
        SELECT c2.id
        FROM clientes c2
        WHERE ${activeClientFilterC2}
        AND EXISTS (
          SELECT 1
          FROM pagos_clientes p2
          INNER JOIN facturas_clientes f2 ON f2.id = p2.factura_id
          WHERE p2.cliente_id = c2.id
            AND EXTRACT(YEAR FROM COALESCE(f2.periodo_facturado_inicio, f2.fecha_factura)) = ${year}
            AND LOWER(COALESCE(f2.estado, '')) IN ('pago', 'pagado', 'pagada', 'parcial', 'adelantado', 'pago adelantado', 'adelantada')
            ${month ? sql`AND EXTRACT(MONTH FROM COALESCE(f2.periodo_facturado_inicio, f2.fecha_factura)) = ${month}` : sql``}
        )
        AND (
          ${search} = ''
          OR c2.nombre ILIKE ${`%${search}%`}
          OR c2.apellidos ILIKE ${`%${search}%`}
          OR c2.codigo_cliente ILIKE ${`%${search}%`}
        )
        ORDER BY c2.nombre ASC, c2.apellidos ASC
        LIMIT ${limit}
        OFFSET ${offset}
      )
      GROUP BY c.id, c.nombre, c.apellidos, EXTRACT(MONTH FROM COALESCE(f.periodo_facturado_inicio, f.fecha_factura))
      ORDER BY c.nombre ASC, c.apellidos ASC, mes ASC NULLS LAST;
    `);

    const clientsMap = new Map<
      string,
      {
        clienteId: string;
        nombreCompleto: string;
        meses: Record<string, { pagado: boolean; pagos: number; monto: string; estado: string; adelantado: boolean; periodoLabel?: string | null }>;
      }
    >();

    for (const row of rowsResult.rows ?? []) {
      const clienteId = row.cliente_id;
      const nombreCompleto = `${row.nombre ?? ""} ${row.apellidos ?? ""}`.trim();

      if (!clientsMap.has(clienteId)) {
        const meses: Record<string, { pagado: boolean; pagos: number; monto: string; estado: string; adelantado: boolean; periodoLabel?: string | null }> = {};
        for (let month = 1; month <= 12; month += 1) {
          meses[String(month)] = { pagado: false, pagos: 0, monto: "0", estado: "ninguno", adelantado: false, periodoLabel: null };
        }

        clientsMap.set(clienteId, {
          clienteId,
          nombreCompleto,
          meses,
        });
      }

      if (row.mes) {
        const key = String(row.mes);
        const pagos = Number(row.pagos ?? 0);
        const periodoInicio = row.periodo_inicio ? new Date(row.periodo_inicio) : null;

        clientsMap.get(clienteId)!.meses[key] = {
          pagado: pagos > 0,
          pagos,
          monto: row.monto ?? "0",
          estado: row.estado_mes ?? "ninguno",
          adelantado: esFacturaAdelantada(row.estado_mes, row.observaciones, false),
          periodoLabel: periodoInicio
            ? formatearPeriodoFacturado(periodoInicio.getMonth() + 1, periodoInicio.getFullYear())
            : null,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        search,
        clients: Array.from(clientsMap.values()),
        pagination: {
          page,
          limit,
          total,
          totalPages: total > 0 ? Math.ceil(total / limit) : 1,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching pagos por mes:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error interno del servidor",
      },
      { status: 500 },
    );
  }
});
