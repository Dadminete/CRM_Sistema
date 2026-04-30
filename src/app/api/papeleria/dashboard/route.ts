import { NextResponse } from "next/server";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawRange = Number(searchParams.get("rangeDays") || 30);
    const rangeDays = [7, 30, 90].includes(rawRange) ? rawRange : 30;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const rangeStart = new Date(startOfToday);
    rangeStart.setDate(rangeStart.getDate() - (rangeDays - 1));

    const [metricsRaw, lowStockRaw, dailyNetSalesRaw, paymentDistributionRaw, topProductsRaw, latestSalesRaw] =
      await Promise.all([
        db.execute(sql`
          SELECT
            COALESCE(SUM(CASE
              WHEN estado = 'COMPLETADA' AND fecha_venta >= ${startOfToday.toISOString()}
              THEN (CAST(subtotal AS DECIMAL) - CAST(descuentos AS DECIMAL))
              ELSE 0
            END), 0) AS net_today,
            COALESCE(COUNT(CASE
              WHEN estado = 'COMPLETADA' AND fecha_venta >= ${startOfToday.toISOString()}
              THEN 1 ELSE NULL
            END), 0) AS sales_today_count,
            COALESCE(SUM(CASE
              WHEN estado = 'COMPLETADA' AND fecha_venta >= ${startOfMonth.toISOString()}
              THEN (CAST(subtotal AS DECIMAL) - CAST(descuentos AS DECIMAL))
              ELSE 0
            END), 0) AS net_month,
            COALESCE(COUNT(CASE
              WHEN estado = 'COMPLETADA' AND fecha_venta >= ${startOfMonth.toISOString()}
              THEN 1 ELSE NULL
            END), 0) AS sales_month_count
          FROM ventas_papeleria
        `),
        db.execute(sql`
          SELECT
            COALESCE(COUNT(*), 0) AS low_stock_count
          FROM productos_papeleria
          WHERE activo = true
            AND stock_actual <= stock_minimo
        `),
        db.execute(sql`
          WITH days AS (
            SELECT generate_series(
              DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Santo_Domingo') - ${sql.raw(`INTERVAL '${rangeDays - 1} day'`)},
              DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Santo_Domingo'),
              INTERVAL '1 day'
            )::date AS day
          ),
          sales AS (
            SELECT
              DATE_TRUNC('day', fecha_venta AT TIME ZONE 'America/Santo_Domingo')::date AS day,
              SUM(CAST(subtotal AS DECIMAL) - CAST(descuentos AS DECIMAL)) AS total
            FROM ventas_papeleria
            WHERE estado = 'COMPLETADA'
              AND fecha_venta >= ${rangeStart.toISOString()}
            GROUP BY 1
          )
          SELECT
            TO_CHAR(days.day, 'DD/MM') AS label,
            COALESCE(sales.total, 0) AS total
          FROM days
          LEFT JOIN sales ON sales.day = days.day
          ORDER BY days.day ASC
        `),
        db.execute(sql`
          SELECT
            metodo_pago AS metodo,
            COALESCE(SUM(CAST(subtotal AS DECIMAL) - CAST(descuentos AS DECIMAL)), 0) AS total
          FROM ventas_papeleria
          WHERE estado = 'COMPLETADA'
            AND fecha_venta >= ${rangeStart.toISOString()}
          GROUP BY metodo_pago
          HAVING COALESCE(SUM(CAST(subtotal AS DECIMAL) - CAST(descuentos AS DECIMAL)), 0) > 0
          ORDER BY total DESC
        `),
        db.execute(sql`
          SELECT
            dv.nombre_producto AS nombre,
            COALESCE(SUM(dv.cantidad), 0) AS cantidad
          FROM detalles_venta_papeleria dv
          INNER JOIN ventas_papeleria v ON v.id = dv.venta_id
          WHERE v.estado = 'COMPLETADA'
            AND v.fecha_venta >= ${rangeStart.toISOString()}
          GROUP BY dv.nombre_producto
          ORDER BY cantidad DESC
          LIMIT 5
        `),
        db.execute(sql`
          SELECT
            id,
            numero_venta,
            fecha_venta,
            COALESCE(cliente_nombre, 'Cliente general') AS cliente_nombre,
            metodo_pago,
            estado,
            (CAST(subtotal AS DECIMAL) - CAST(descuentos AS DECIMAL)) AS neto
          FROM ventas_papeleria
          ORDER BY fecha_venta DESC
          LIMIT 10
        `),
      ]);

    const metricsRow = (metricsRaw.rows[0] as {
      net_today: string | number;
      sales_today_count: string | number;
      net_month: string | number;
      sales_month_count: string | number;
    }) || {
      net_today: 0,
      sales_today_count: 0,
      net_month: 0,
      sales_month_count: 0,
    };

    const lowStockRow = (lowStockRaw.rows[0] as { low_stock_count: string | number }) || {
      low_stock_count: 0,
    };

    const totalProductsRaw = await db.execute(sql`
      SELECT COALESCE(COUNT(*), 0) AS total_products
      FROM productos_papeleria
      WHERE activo = true
    `);

    const totalProductsRow = (totalProductsRaw.rows[0] as { total_products: string | number }) || {
      total_products: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          netSalesToday: Number(metricsRow.net_today || 0),
          salesTodayCount: Number(metricsRow.sales_today_count || 0),
          netSalesMonth: Number(metricsRow.net_month || 0),
          salesMonthCount: Number(metricsRow.sales_month_count || 0),
          totalProducts: Number(totalProductsRow.total_products || 0),
          lowStockProducts: Number(lowStockRow.low_stock_count || 0),
        },
        charts: {
          rangeDays,
          dailyNetSales: (dailyNetSalesRaw.rows as Array<{ label: string; total: string | number }>).map((r) => ({
            fecha: r.label,
            total: Number(r.total || 0),
          })),
          paymentDistribution: (paymentDistributionRaw.rows as Array<{ metodo: string; total: string | number }>).map(
            (r) => ({
              name: r.metodo,
              value: Number(r.total || 0),
            }),
          ),
          topProducts: (topProductsRaw.rows as Array<{ nombre: string; cantidad: string | number }>).map((r) => ({
            nombre: r.nombre,
            cantidad: Number(r.cantidad || 0),
          })),
        },
        latestSales: (latestSalesRaw.rows as Array<{
          id: string;
          numero_venta: string;
          fecha_venta: string;
          cliente_nombre: string;
          metodo_pago: string;
          estado: string;
          neto: string | number;
        }>).map((r) => ({
          id: r.id,
          numeroVenta: r.numero_venta,
          fechaVenta: r.fecha_venta,
          cliente_nombre: r.cliente_nombre,
          metodoPago: r.metodo_pago,
          estado: r.estado,
          total: Number(r.neto || 0),
        })),
      },
    });
  } catch (error) {
    console.error("Error en dashboard de papeleria:", error);
    return NextResponse.json({ success: false, error: "No se pudo cargar el dashboard" }, { status: 500 });
  }
}
