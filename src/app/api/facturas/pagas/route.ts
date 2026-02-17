import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { facturasClientes, cuentasPorCobrar, clientes, pagosClientes } from "@/lib/db/schema";
import { eq, and, or, sql, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    console.log('[PAGAS] Fetching paid invoices...');
    console.log('[PAGAS] Filters:', { startDate, endDate });

    // Facturas con estado 'pagada' o 'pagado'
    let conditions = or(
      eq(facturasClientes.estado, "pagada"),
      eq(facturasClientes.estado, "pagado"),
    );

    // Subquery para obtener último pago de cada factura
    const lastPaymentSubquery = db
      .select({
        facturaId: pagosClientes.facturaId,
        fechaPago: sql<string>`MAX(${pagosClientes.fechaPago})`.as("fecha_pago"),
        metodoPago: sql<string>`MAX(${pagosClientes.metodoPago})`.as("metodo_pago"),
        totalPagado: sql<string>`SUM(${pagosClientes.monto})`.as("total_pagado"),
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
        updatedAt: facturasClientes.updatedAt,
        clienteId: clientes.id,
        clienteNombre: clientes.nombre,
        clienteApellidos: clientes.apellidos,
        clienteEmail: clientes.email,
        clienteTelefono: clientes.telefono,
        fechaPago: lastPaymentSubquery.fechaPago,
        metodoPago: lastPaymentSubquery.metodoPago,
        totalPagado: lastPaymentSubquery.totalPagado,
      })
      .from(facturasClientes)
      .innerJoin(clientes, eq(facturasClientes.clienteId, clientes.id))
      .leftJoin(lastPaymentSubquery, eq(facturasClientes.id, lastPaymentSubquery.facturaId))
      .where(conditions)
      .orderBy(desc(facturasClientes.fechaFactura));

    console.log(`[PAGAS] Found ${pagas.length} paid invoices`);

    return NextResponse.json({
      success: true,
      data: pagas,
    });
  } catch (error: any) {
    console.error("Error fetching paid invoices:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
