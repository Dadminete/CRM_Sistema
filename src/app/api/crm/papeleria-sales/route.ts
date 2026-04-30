import { NextResponse } from "next/server";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type SalesPoint = {
  period: string;
  label: string;
  total: number;
};

export async function GET() {
  try {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const monthlyRaw = await db.execute(sql`
      SELECT
        DATE_TRUNC('month', fecha_venta AT TIME ZONE 'America/Santo_Domingo')::date AS period_start,
        COALESCE(SUM((CAST(subtotal AS DECIMAL) - CAST(descuentos AS DECIMAL))), 0) AS total
      FROM ventas_papeleria
      WHERE estado = 'COMPLETADA'
        AND fecha_venta >= ${startDate.toISOString()}
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    const biweeklyRaw = await db.execute(sql`
      SELECT
        DATE_TRUNC('month', fecha_venta AT TIME ZONE 'America/Santo_Domingo')::date AS month_start,
        CASE
          WHEN EXTRACT(DAY FROM fecha_venta AT TIME ZONE 'America/Santo_Domingo') <= 15 THEN 1
          ELSE 2
        END AS quincena,
        COALESCE(SUM((CAST(subtotal AS DECIMAL) - CAST(descuentos AS DECIMAL))), 0) AS total
      FROM ventas_papeleria
      WHERE estado = 'COMPLETADA'
        AND fecha_venta >= ${startDate.toISOString()}
      GROUP BY 1, 2
      ORDER BY 1 ASC, 2 ASC
    `);

    const monthFormatter = new Intl.DateTimeFormat("es-DO", {
      month: "short",
      year: "2-digit",
      timeZone: "America/Santo_Domingo",
    });

    const monthStarts: Date[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      monthStarts.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    }

    const monthlyMap = new Map<string, number>();
    for (const row of monthlyRaw.rows as Array<{ period_start: string; total: string | number }>) {
      monthlyMap.set(String(row.period_start).slice(0, 10), Number(row.total || 0));
    }

    const biweeklyMap = new Map<string, number>();
    for (const row of biweeklyRaw.rows as Array<{ month_start: string; quincena: number; total: string | number }>) {
      const monthKey = String(row.month_start).slice(0, 10);
      biweeklyMap.set(`${monthKey}-${Number(row.quincena)}`, Number(row.total || 0));
    }

    const monthly: SalesPoint[] = monthStarts.map((monthStart) => {
      const key = monthStart.toISOString().slice(0, 10);
      return {
        period: key,
        label: monthFormatter.format(monthStart).replace(".", ""),
        total: Number((monthlyMap.get(key) || 0).toFixed(2)),
      };
    });

    const biweekly: SalesPoint[] = monthStarts.flatMap((monthStart) => {
      const key = monthStart.toISOString().slice(0, 10);
      const monthShort = monthFormatter.format(monthStart).replace(".", "");
      const firstHalf: SalesPoint = {
        period: `${key}-1`,
        label: `1ra ${monthShort}`,
        total: Number((biweeklyMap.get(`${key}-1`) || 0).toFixed(2)),
      };
      const secondHalf: SalesPoint = {
        period: `${key}-2`,
        label: `2da ${monthShort}`,
        total: Number((biweeklyMap.get(`${key}-2`) || 0).toFixed(2)),
      };

      return [firstHalf, secondHalf];
    });

    return NextResponse.json({
      success: true,
      data: {
        monthly,
        biweekly,
      },
    });
  } catch (error) {
    console.error("Error fetching papeleria sales chart:", error);
    return NextResponse.json(
      { success: false, error: "No se pudo cargar ventas de papeleria" },
      { status: 500 },
    );
  }
}
