import { NextResponse } from "next/server";

import { and, desc, eq, gt, ilike, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { clientes, cuentasPorCobrar, facturasClientes } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const fmt = (v: unknown) => Number(v ?? 0);

export async function GET() {
  try {
    // ── 1. Facturas vencidas (pendiente y más de 5 días desde creación) ──────
    const overdueInvoices = await db
      .select({
        id: facturasClientes.id,
        numeroFactura: facturasClientes.numeroFactura,
        fechaFactura: facturasClientes.fechaFactura,
        total: facturasClientes.total,
        estado: facturasClientes.estado,
        montoPendiente: cuentasPorCobrar.montoPendiente,
        diasTranscurridos: sql<number>`(CURRENT_DATE - ${facturasClientes.fechaFactura}::date)::int`,
        clienteId: clientes.id,
        clienteNombre: clientes.nombre,
        clienteApellidos: clientes.apellidos,
        clienteEmail: clientes.email,
        clienteTelefono: clientes.telefono,
        fotoUrl: clientes.fotoUrl,
      })
      .from(facturasClientes)
      .innerJoin(cuentasPorCobrar, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .innerJoin(clientes, eq(facturasClientes.clienteId, clientes.id))
      .where(
        and(
          ilike(facturasClientes.estado, "pendiente"),
          gt(cuentasPorCobrar.montoPendiente, "0"),
          sql`(CURRENT_DATE - ${facturasClientes.fechaFactura}::date) >= 5`,
        ),
      )
      .orderBy(desc(sql`(CURRENT_DATE - ${facturasClientes.fechaFactura}::date)`));

    // ── 2. Resumen de cards por estado ─────────────────────────────────────
    const [cardPendiente] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
        monto: sql<string>`COALESCE(SUM(${cuentasPorCobrar.montoPendiente}), 0)`,
      })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .where(and(ilike(facturasClientes.estado, "pendiente"), gt(cuentasPorCobrar.montoPendiente, "0")));

    const [cardParcial] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
        monto: sql<string>`COALESCE(SUM(${cuentasPorCobrar.montoPendiente}), 0)`,
      })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .where(
        and(
          or(ilike(facturasClientes.estado, "parcial"), ilike(facturasClientes.estado, "pago parcial")),
          gt(cuentasPorCobrar.montoPendiente, "0"),
        ),
      );

    const [cardAdelantado] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
        monto: sql<string>`COALESCE(SUM(${cuentasPorCobrar.montoPendiente}), 0)`,
      })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .where(
        and(
          or(ilike(facturasClientes.estado, "adelantado"), ilike(facturasClientes.estado, "pago adelantado")),
          gt(cuentasPorCobrar.montoPendiente, "0"),
        ),
      );

    const [cardPagada] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(facturasClientes)
      .where(ilike(facturasClientes.estado, "pagada"));

    // ── 3. Clientes con pagos tardíos frecuentes (≥4 días desde emisión) ───
    const latePayersRaw = await db.execute(sql`
      SELECT
        c.id                                      AS cliente_id,
        c.nombre                                  AS nombre,
        c.apellidos                               AS apellidos,
        c.email                                   AS email,
        c.foto_url                                AS foto_url,
        COUNT(p.id)::int                          AS total_pagos,
        COUNT(p.id) FILTER (
          WHERE (p.fecha_pago::date - f.fecha_factura::date) >= 4
        )::int                                    AS pagos_tardios,
        ROUND(
          COUNT(p.id) FILTER (
            WHERE (p.fecha_pago::date - f.fecha_factura::date) >= 4
          ) * 100.0
          / NULLIF(COUNT(p.id), 0)
        , 0)::int                                 AS pct_tardio,
        ROUND(
          AVG(p.fecha_pago::date - f.fecha_factura::date)
        , 1)::float                               AS promedio_dias
      FROM pagos_clientes p
      JOIN facturas_clientes f ON f.id = p.factura_id
      JOIN clientes c ON c.id = p.cliente_id
      WHERE p.estado = 'confirmado'
      GROUP BY c.id, c.nombre, c.apellidos, c.email, c.foto_url
      HAVING COUNT(p.id) >= 1
         AND COUNT(p.id) FILTER (
               WHERE (p.fecha_pago::date - f.fecha_factura::date) >= 4
             ) >= 1
      ORDER BY pct_tardio DESC, pagos_tardios DESC
      LIMIT 20
    `);

    // ── 4. Clientes con más facturas en pago parcial (para gráfica) ─────────
    const parcialesChartRaw = await db.execute(sql`
      SELECT
        c.id           AS cliente_id,
        c.nombre       AS nombre,
        c.apellidos    AS apellidos,
        COUNT(f.id)::int AS total_parciales,
        COALESCE(SUM(cpc.monto_pendiente)::numeric, 0) AS monto_pendiente
      FROM facturas_clientes f
      JOIN clientes c ON c.id = f.cliente_id
      JOIN cuentas_por_cobrar cpc ON cpc.factura_id = f.id
      WHERE f.estado ILIKE 'parcial'
         OR f.estado ILIKE 'pago parcial'
      GROUP BY c.id, c.nombre, c.apellidos
      ORDER BY total_parciales DESC
      LIMIT 10
    `);

    return NextResponse.json({
      success: true,
      cards: {
        pendiente: { count: cardPendiente?.count ?? 0, monto: fmt(cardPendiente?.monto) },
        parcial: { count: cardParcial?.count ?? 0, monto: fmt(cardParcial?.monto) },
        adelantado: { count: cardAdelantado?.count ?? 0, monto: fmt(cardAdelantado?.monto) },
        pagada: { count: cardPagada?.count ?? 0 },
      },
      overdueInvoices,
      latePayersRaw: latePayersRaw.rows,
      parcialesChart: parcialesChartRaw.rows,
    });
  } catch (error) {
    console.error("[cuentas-por-cobrar GET]", error);
    return NextResponse.json({ success: false, error: "Error al obtener datos" }, { status: 500 });
  }
}
