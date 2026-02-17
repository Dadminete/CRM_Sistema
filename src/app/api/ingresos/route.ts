import { NextRequest, NextResponse } from "next/server";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { pagosClientes, clientes, movimientosContables, categoriasCuentas, ventasPapeleria } from "@/lib/db/schema";
import { getPaginationParams, getPaginationOffset, createPaginatedData } from "@/lib/pagination";

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");

      // Get pagination parameters for the list
      const { page, limit } = getPaginationParams(req);
      const offset = getPaginationOffset(page, limit);

      // 1. Fetch Client Payments
      const paymentsQuery = db
        .select({
          id: pagosClientes.id,
          monto: pagosClientes.monto,
          fecha: pagosClientes.fechaPago,
          metodo: pagosClientes.metodoPago,
          referencia: pagosClientes.numeroReferencia,
          cliente: sql<string>`${clientes.nombre} || ' ' || ${clientes.apellidos}`,
          tipo: sql<string>`'pago_cliente'`,
          descripcion: sql<string>`'Pago de factura ' || ${pagosClientes.numeroPago}`,
        })
        .from(pagosClientes)
        .leftJoin(clientes, eq(pagosClientes.clienteId, clientes.id));

      // 2. Fetch Stationery Sales (Ventas Papeleria)
      const stationerySalesQuery = db
        .select({
          id: ventasPapeleria.id,
          monto: ventasPapeleria.total,
          fecha: sql<string>`CAST(${ventasPapeleria.fechaVenta} AS DATE)`,
          metodo: ventasPapeleria.metodoPago,
          referencia: ventasPapeleria.numeroVenta,
          cliente: ventasPapeleria.clienteNombre,
          tipo: sql<string>`'venta_papeleria'`,
          descripcion: sql<string>`'Venta de papelería ' || ${ventasPapeleria.numeroVenta}`,
        })
        .from(ventasPapeleria);

      // 3. Fetch Accounting Incomes
      const movementsQuery = db
        .select({
          id: movimientosContables.id,
          monto: movimientosContables.monto,
          fecha: sql<string>`CAST(${movimientosContables.fecha} AS DATE)`,
          metodo: movimientosContables.metodo,
          referencia: sql<string>`''`,
          cliente: sql<string>`'Contabilidad'`,
          tipo: sql<string>`'movimiento_contable'`,
          descripcion: movimientosContables.descripcion,
        })
        .from(movimientosContables)
        .where(eq(movimientosContables.tipo, "ingreso"));

      const [payments, stationerySales, movements] = await Promise.all([
        paymentsQuery,
        stationerySalesQuery,
        movementsQuery,
      ]);

      // Normalize and Merge
      const allIncomes = [
        ...payments.map((p: any) => ({
          id: p.id,
          monto: parseFloat(p.monto),
          fecha: p.fecha,
          metodo: p.metodo,
          referencia: p.referencia,
          cliente: p.cliente ?? "Cliente Desconocido",
          tipo: "PAGO CLIENTE",
          descripcion: p.descripcion,
          origen: "pagos_clientes",
        })),
        ...stationerySales.map((s: any) => ({
          id: s.id,
          monto: parseFloat(s.monto),
          fecha: s.fecha,
          metodo: s.metodo,
          referencia: s.referencia,
          cliente: s.cliente ?? "Venta de Mostrador",
          tipo: "VENTA PAPELERIA",
          descripcion: s.descripcion,
          origen: "ventas_papeleria",
        })),
        ...movements.map((m: any) => ({
          id: m.id,
          monto: parseFloat(m.monto),
          fecha: m.fecha,
          metodo: m.metodo,
          referencia: m.referencia,
          cliente: "Ingreso Contable",
          tipo: "OTRO INGRESO",
          descripcion: m.descripcion,
          origen: "movimientos_contables",
        })),
      ];

      // Sort by date descending
      allIncomes.sort((a, b) => {
        const dateA = new Date(a.fecha).getTime();
        const dateB = new Date(b.fecha).getTime();
        return dateB - dateA;
      });

      // Apply pagination to the list
      const total = allIncomes.length;
      const paginatedIncomes = allIncomes.slice(offset, offset + limit);

      // Calculate Totals for Charts (Current Month daily)
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];

      const dailyData = await db.execute(sql`
            SELECT 
                DATE(fecha_pago) as date, 
                SUM(monto) as total
            FROM pagos_clientes
            WHERE fecha_pago >= ${firstDayOfMonth}
            GROUP BY DATE(fecha_pago)
            UNION ALL
            SELECT 
                DATE(fecha_venta) as date, 
                SUM(total) as total
            FROM ventas_papeleria
            WHERE fecha_venta >= ${firstDayOfMonth}
            GROUP BY DATE(fecha_venta)
            UNION ALL
            SELECT 
                DATE(fecha) as date, 
                SUM(monto) as total
            FROM movimientos_contables
            WHERE tipo = 'ingreso' AND fecha >= ${firstDayOfMonth}
            GROUP BY DATE(fecha)
            ORDER BY date ASC
        `);

      // Consolidate daily data
      const consolidatedDailyData: Record<string, number> = {};
      dailyData.rows.forEach((row: any) => {
        const dateStr = new Date(row.date).toISOString().split("T")[0];
        consolidatedDailyData[dateStr] = (consolidatedDailyData[dateStr] ?? 0) + parseFloat(row.total);
      });

      const finalDailyStats = Object.entries(consolidatedDailyData)
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Summary Statistics (Current Month Only)
      const currentMonthIncomes = allIncomes.filter((income) => {
        const d = new Date(income.fecha);
        return d >= new Date(today.getFullYear(), today.getMonth(), 1);
      });

      const totalAmount = currentMonthIncomes.reduce((acc, curr) => acc + curr.monto, 0);
      const count = currentMonthIncomes.length;
      const average = count > 0 ? totalAmount / count : 0;

      return successResponse({
        ...createPaginatedData(paginatedIncomes, page, limit, total),
        dailyStats: finalDailyStats,
        summary: {
          total: totalAmount,
          count: count,
          average: average,
        },
      });
    } catch (error: any) {
      console.error("Error fetching incomes:", error);
      return CommonErrors.internalError("Error al obtener ingresos");
    }
  },
  { requiredPermission: "ingresos:leer" },
);
