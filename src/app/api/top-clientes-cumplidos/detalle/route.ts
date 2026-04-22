import { NextResponse } from "next/server";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { jsonResponse } from "@/lib/serializers";

// Forzar que el endpoint sea dinámico y no se cachee
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = {
  clienteId: string;
  nombre: string;
  apellidos: string;
  pagosATiempo: number;
  ultimasFechasPago: unknown;
};

function normalizeFechas(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);

  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  if (value && typeof value === "object" && Array.isArray(value)) return value.map(String);

  return [];
}

export async function GET() {
  try {
    const result = await db.execute<Row>(sql`
      WITH on_time AS (
        SELECT
          p.cliente_id,
          c.nombre,
          c.apellidos,
          p.fecha_pago,
          ROW_NUMBER() OVER (PARTITION BY p.cliente_id ORDER BY p.fecha_pago DESC) AS rn,
          COUNT(*) OVER (PARTITION BY p.cliente_id) AS pagos_total
        FROM pagos_clientes p
        JOIN facturas_clientes f ON f.id = p.factura_id
        JOIN clientes c ON c.id = p.cliente_id
        WHERE
          p.estado = 'confirmado'
          AND f.fecha_vencimiento IS NOT NULL
          AND p.fecha_pago <= f.fecha_vencimiento
      )
      SELECT
        on_time.cliente_id as "clienteId",
        on_time.nombre as "nombre",
        on_time.apellidos as "apellidos",
        MAX(on_time.pagos_total)::int as "pagosATiempo",
        COALESCE(
          jsonb_agg(to_char(on_time.fecha_pago, 'YYYY-MM-DD') ORDER BY on_time.fecha_pago DESC)
            FILTER (WHERE on_time.rn <= 3),
          '[]'::jsonb
        ) as "ultimasFechasPago"
      FROM on_time
      GROUP BY on_time.cliente_id, on_time.nombre, on_time.apellidos
      ORDER BY MAX(on_time.pagos_total) DESC, on_time.nombre ASC
      LIMIT 20;
    `);

    const data = result.rows.map((row) => ({
      clienteId: row.clienteId,
      nombre: row.nombre,
      apellidos: row.apellidos,
      pagosATiempo: Number(row.pagosATiempo),
      ultimasFechasPago: normalizeFechas(row.ultimasFechasPago),
    }));

    return jsonResponse({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching top clientes cumplidos (detalle):", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
