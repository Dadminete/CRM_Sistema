import { NextRequest, NextResponse } from "next/server";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { pagosClientes, clientes, movimientosContables, categoriasCuentas, ventasPapeleria, usuarios } from "@/lib/db/schema";
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
          fecha: pagosClientes.createdAt,
          metodo: pagosClientes.metodoPago,
          referencia: pagosClientes.numeroReferencia,
          cliente: sql<string>`${clientes.nombre} || ' ' || ${clientes.apellidos}`,
          tipo: sql<string>`'pago_cliente'`,
          descripcion: sql<string>`'Pago de factura ' || ${pagosClientes.numeroPago}`,
          cobrador: sql<string>`${usuarios.nombre} || ' ' || ${usuarios.apellido}`,
        })
        .from(pagosClientes)
        .leftJoin(clientes, eq(pagosClientes.clienteId, clientes.id))
        .leftJoin(usuarios, eq(pagosClientes.recibidoPor, usuarios.id));

      // 2. Fetch Stationery Sales (Ventas Papeleria)
      const stationerySalesQuery = db
        .select({
          id: ventasPapeleria.id,
          monto: ventasPapeleria.total,
          fecha: ventasPapeleria.fechaVenta,
          metodo: ventasPapeleria.metodoPago,
          referencia: ventasPapeleria.numeroVenta,
          cliente: ventasPapeleria.clienteNombre,
          tipo: sql<string>`'venta_papeleria'`,
          descripcion: sql<string>`'Venta de papelería ' || ${ventasPapeleria.numeroVenta}`,
          cobrador: sql<string>`${usuarios.nombre} || ' ' || ${usuarios.apellido}`,
        })
        .from(ventasPapeleria)
        .leftJoin(usuarios, eq(ventasPapeleria.usuarioId, usuarios.id));

      // 3. Fetch Accounting Incomes
      const movementsQuery = db
        .select({
          id: movimientosContables.id,
          monto: movimientosContables.monto,
          fecha: movimientosContables.fecha,
          metodo: movimientosContables.metodo,
          referencia: sql<string>`''`,
          cliente: sql<string>`'Contabilidad'`,
          tipo: sql<string>`'movimiento_contable'`,
          descripcion: movimientosContables.descripcion,
          cobrador: sql<string>`${usuarios.nombre} || ' ' || ${usuarios.apellido}`,
        })
        .from(movimientosContables)
        .leftJoin(usuarios, eq(movimientosContables.usuarioId, usuarios.id))
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
          cobrador: p.cobrador ?? "N/A",
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
          cobrador: s.cobrador ?? "N/A",
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
          cobrador: m.cobrador ?? "N/A",
          tipo: "OTRO INGRESO",
          descripcion: m.descripcion,
          origen: "movimientos_contables",
        })),
      ];

      // Filter to current month ONLY
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      lastDayOfMonth.setHours(23, 59, 59, 999);

      const parseSafeDate = (d: Date | string) => new Date(d instanceof Date ? d : (d + "T00:00:00Z"));

      const monthlyIncomes = allIncomes.filter((income) => {
        const d = parseSafeDate(income.fecha);
        return d >= firstDayOfMonth && d <= lastDayOfMonth;
      });

      // Sort by date descending
      monthlyIncomes.sort((a, b) => {
        const dateA = parseSafeDate(a.fecha).getTime();
        const dateB = parseSafeDate(b.fecha).getTime();
        return dateB - dateA;
      });

      // Apply pagination to the list
      const total = monthlyIncomes.length;
      const paginatedIncomes = monthlyIncomes.slice(offset, offset + limit);

      // Calculate Totals for Charts (Current Month daily)
      const firstDayOfMonthSQL = firstDayOfMonth.toISOString().split("T")[0];

      const dailyData = await db.execute(sql`
            SELECT 
                DATE(fecha_pago) as date, 
                SUM(monto) as total
            FROM pagos_clientes
            WHERE fecha_pago >= ${firstDayOfMonthSQL}
            GROUP BY DATE(fecha_pago)
            UNION ALL
            SELECT 
                DATE(fecha_venta) as date, 
                SUM(total) as total
            FROM ventas_papeleria
            WHERE fecha_venta >= ${firstDayOfMonthSQL}
            GROUP BY DATE(fecha_venta)
            UNION ALL
            SELECT 
                DATE(fecha) as date, 
                SUM(monto) as total
            FROM movimientos_contables
            WHERE tipo = 'ingreso' AND fecha >= ${firstDayOfMonthSQL}
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

      // Summary Statistics 
      const totalAmount = monthlyIncomes.reduce((acc, curr) => acc + curr.monto, 0);
      const count = monthlyIncomes.length;
      const average = count > 0 ? totalAmount / count : 0;

      return NextResponse.json({
        success: true,
        data: monthlyIncomes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
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
