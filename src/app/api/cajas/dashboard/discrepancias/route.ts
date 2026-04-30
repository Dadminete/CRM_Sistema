import { NextResponse } from "next/server";

import { sql } from "drizzle-orm";
import { subDays, startOfDay } from "date-fns";

import { db } from "@/lib/db";

export async function GET() {
  try {
    const discrepancyWindowStart = subDays(startOfDay(new Date()), 60);

    const result = await db.execute(sql`
      SELECT COUNT(*)
      FROM (
        SELECT
          s.id,
          CAST(s.monto_apertura AS NUMERIC) AS apertura,
          CAST(s.monto_cierre AS NUMERIC) AS cierre,
          COALESCE(SUM(CASE WHEN m.tipo IN ('ingreso', 'traspaso') THEN CAST(m.monto AS NUMERIC) ELSE 0 END), 0) AS ingresos,
          COALESCE(SUM(CASE WHEN m.tipo IN ('gasto', 'egreso') THEN CAST(m.monto AS NUMERIC) ELSE 0 END), 0) AS gastos
        FROM sesiones_caja s
        LEFT JOIN movimientos_contables m
          ON m.caja_id = s.caja_id
          AND m.fecha >= s.fecha_apertura
          AND m.fecha <= s.fecha_cierre
        WHERE s.estado = 'cerrada'
          AND s.monto_cierre IS NOT NULL
          AND s.fecha_cierre >= ${discrepancyWindowStart.toISOString()}
          AND COALESCE(s.observaciones, '') NOT LIKE '%[RESOLUCIÓN%'
          AND COALESCE(s.observaciones, '') NOT LIKE '%[FORZADO ADMIN]%'
        GROUP BY s.id, s.monto_apertura, s.monto_cierre
      ) AS session_totals
      WHERE ABS((apertura + ingresos - gastos) - cierre) > 0.01
    `);

    return NextResponse.json({
      success: true,
      data: {
        discrepancias: parseInt((result.rows[0] as any)?.count || "0", 10),
      },
    });
  } catch (error: any) {
    console.error("Error obteniendo discrepancias:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
