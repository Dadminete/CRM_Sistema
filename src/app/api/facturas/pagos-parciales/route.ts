import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { facturasClientes, cuentasPorCobrar, clientes, pagosClientes, usuarios } from "@/lib/db/schema";
import { eq, or, sql, desc } from "drizzle-orm";
import { jsonResponse } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    console.log('[PAGOS_PARCIALES] Fetching partial payment invoices...');
    console.log('[PAGOS_PARCIALES] Filters:', { startDate, endDate });

    // Facturas con pago parcial
    let conditions = or(
      eq(facturasClientes.estado, "parcial"),
      eq(facturasClientes.estado, "pago parcial"),
    );

    // Agregar filtros de fecha si existen
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      conditions = sql`
        (${conditions})
        AND ${facturasClientes.fechaFactura} >= ${start.toISOString().split('T')[0]}
        AND ${facturasClientes.fechaFactura} <= ${end.toISOString().split('T')[0]}
      `;
    }

    // Subquery para obtener último pago de cada factura
    const lastPaymentSubquery = db
      .select({
        facturaId: pagosClientes.facturaId,
        fechaPago: sql<string>`MAX(${pagosClientes.fechaPago})`.as("fecha_pago"),
        ultimoPagoAt: sql<string>`MAX(${pagosClientes.createdAt})`.as("ultimo_pago_at"),
        metodoPago: sql<string>`MAX(${pagosClientes.metodoPago})`.as("metodo_pago"),
        totalPagado: sql<string>`SUM(${pagosClientes.monto})`.as("total_pagado"),
        cobrador: sql<string>`MAX(${usuarios.nombre} || ' ' || ${usuarios.apellido})`.as("cobrador"),
      })
      .from(pagosClientes)
      .leftJoin(usuarios, eq(pagosClientes.recibidoPor, usuarios.id))
      .groupBy(pagosClientes.facturaId)
      .as("ultimo_pago");

    const parciales = await db
      .select({
        id: facturasClientes.id,
        numeroFactura: facturasClientes.numeroFactura,
        fechaFactura: facturasClientes.fechaFactura,
        fechaVencimiento: facturasClientes.fechaVencimiento,
        total: facturasClientes.total,
        estado: facturasClientes.estado,
        subtotal: facturasClientes.subtotal,
        descuento: facturasClientes.descuento,
        itbis: facturasClientes.itbis,
        observaciones: facturasClientes.observaciones,
        updatedAt: facturasClientes.updatedAt,
        montoPendiente: cuentasPorCobrar.montoPendiente,
        clienteId: clientes.id,
        clienteNombre: clientes.nombre,
        clienteApellidos: clientes.apellidos,
        clienteEmail: clientes.email,
        clienteTelefono: clientes.telefono,
        fechaPago: lastPaymentSubquery.fechaPago,
        ultimoPagoAt: lastPaymentSubquery.ultimoPagoAt,
        metodoPago: lastPaymentSubquery.metodoPago,
        totalPagado: lastPaymentSubquery.totalPagado,
        cobrador: lastPaymentSubquery.cobrador,
      })
      .from(facturasClientes)
      .innerJoin(clientes, eq(facturasClientes.clienteId, clientes.id))
      .leftJoin(cuentasPorCobrar, eq(facturasClientes.id, cuentasPorCobrar.facturaId))
      .leftJoin(lastPaymentSubquery, eq(facturasClientes.id, lastPaymentSubquery.facturaId))
      .where(conditions)
      .orderBy(
        sql`${lastPaymentSubquery.ultimoPagoAt} DESC NULLS LAST`,
        desc(lastPaymentSubquery.fechaPago),
        desc(facturasClientes.fechaFactura),
      );

    console.log(`[PAGOS_PARCIALES] Found ${parciales.length} partial payment invoices`);

    return jsonResponse({
      success: true,
      data: parciales,
    });
  } catch (error: any) {
    console.error("Error fetching partial payment invoices:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
