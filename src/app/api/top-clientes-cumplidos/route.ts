import { NextResponse } from "next/server";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

// Forzar que el endpoint sea dinámico y no se cachee
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = {
  clienteId: string;
  nombre: string;
  apellidos: string;
  pagos: number;
};

export async function GET() {
  try {
    // “Clientes cumplidos” = pagos confirmados hechos antes (o en) la fecha de vencimiento de su factura.
    const result = await db.execute<Row>(sql`
      SELECT
        c.id as "clienteId",
        c.nombre as "nombre",
        c.apellidos as "apellidos",
        COUNT(*)::int as "pagos"
      FROM pagos_clientes p
      JOIN facturas_clientes f ON f.id = p.factura_id
      JOIN clientes c ON c.id = p.cliente_id
      WHERE
        p.estado = 'confirmado'
        AND f.fecha_vencimiento IS NOT NULL
        AND p.fecha_pago <= f.fecha_vencimiento
      GROUP BY c.id, c.nombre, c.apellidos
      ORDER BY COUNT(*) DESC
      LIMIT 5;
    `);

    const data = (result.rows ?? []).map((row, index) => ({
      name: `${row.nombre} ${row.apellidos}`.trim(),
      pagos: Number(row.pagos || 0),
      fill: `var(--chart-${Math.min(index + 1, 5)})`,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Error fetching top clientes cumplidos:", error);
    return NextResponse.json({ success: false, error: error?.message ?? "Unknown error" }, { status: 500 });
  }
}
