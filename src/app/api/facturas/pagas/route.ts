import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { facturasClientes, cuentasPorCobrar, clientes, pagosClientes, usuarios } from "@/lib/db/schema";
import { eq, and, or, sql, desc, aliasedTable } from "drizzle-orm";
import { jsonResponse } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    console.log('[PAGAS] Fetching paid invoices...');
    console.log('[PAGAS] Filters:', { startDate, endDate });

    // Facturas pagadas, con pago parcial, o anticipadas
    let conditions = or(
      eq(facturasClientes.estado, "pagada"),
      eq(facturasClientes.estado, "pagado"),
      eq(facturasClientes.estado, "parcial"),
      eq(facturasClientes.estado, "pago parcial"),
      eq(facturasClientes.estado, "adelantado"),
    );

    // Subquery para obtener último pago de cada factura
    const lastPaymentSubquery = db
      .select({
        facturaId: pagosClientes.facturaId,
        fechaPago: sql<string>`MAX(${pagosClientes.fechaPago})`.as("fecha_pago"),
        ultimoPagoAt: sql<string>`MAX(${pagosClientes.createdAt})`.as("ultimo_pago_at"),
        metodoPago: sql<string>`MAX(${pagosClientes.metodoPago})`.as("metodo_pago"),
        totalPagado: sql<string>`SUM(${pagosClientes.monto})`.as("total_pagado"),
        recibidoPorId: sql<string>`(
          SELECT p2.recibido_por 
          FROM pagos_clientes p2 
          WHERE p2.factura_id = ${pagosClientes.facturaId} 
          ORDER BY p2.created_at DESC 
          LIMIT 1
        )`.as("recibido_por_id"),
      })
      .from(pagosClientes)
      .groupBy(pagosClientes.facturaId)
      .as("ultimo_pago");

    const pagas = await db
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
        cobradoPor: sql<string>`CONCAT(${usuarios.nombre}, ' ', ${usuarios.apellido})`.as("cobrado_por"),
        esPagoAdelantado: sql<boolean>`(
          COALESCE(${facturasClientes.observaciones}, '') ILIKE '%PAGO_ADELANTADO%'
          OR EXISTS (
            SELECT 1
            FROM pagos_clientes p2
            WHERE p2.factura_id = ${facturasClientes.id}
              AND COALESCE(p2.observaciones, '') ILIKE '%PAGO_ADELANTADO%'
          )
        )`.as("es_pago_adelantado"),
      })
      .from(facturasClientes)
      .innerJoin(clientes, eq(facturasClientes.clienteId, clientes.id))
      .leftJoin(cuentasPorCobrar, eq(facturasClientes.id, cuentasPorCobrar.facturaId))
      .leftJoin(lastPaymentSubquery, eq(facturasClientes.id, lastPaymentSubquery.facturaId))
      .leftJoin(usuarios, and(eq(lastPaymentSubquery.recibidoPorId, usuarios.id), eq(usuarios.activo, true)))
      .where(conditions)
      .orderBy(
        sql`${lastPaymentSubquery.ultimoPagoAt} DESC NULLS LAST`,
        desc(lastPaymentSubquery.fechaPago),
        desc(facturasClientes.fechaFactura),
      );

    const totalCobradoMesActualResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(${pagosClientes.monto}), 0)`,
      })
      .from(pagosClientes)
      .where(
        sql`${pagosClientes.fechaPago} >= date_trunc('month', CURRENT_DATE)
            AND ${pagosClientes.fechaPago} < (date_trunc('month', CURRENT_DATE) + interval '1 month')`,
      );

    const totalCobradoMesActual = Number(totalCobradoMesActualResult[0]?.total || 0);

    console.log(`[PAGAS] Found ${pagas.length} paid invoices`);
    console.log(`[PAGAS] Total collected current month: ${totalCobradoMesActual}`);

    return jsonResponse({
      success: true,
      data: pagas,
      totalCobradoMesActual,
    });
  } catch (error: any) {
    console.error("Error fetching paid invoices:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
