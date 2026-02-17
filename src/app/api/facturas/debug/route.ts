import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const numeroFactura = searchParams.get("numero") || "FAC-2026-00204";
    const facturaId = searchParams.get("id") || "4572007d-7a5e-4002-a255-32d5e06d95d3";

    // Verificar la factura
    const resultFactura = await db.execute(sql`
      SELECT 
        fc.id,
        fc.numero_factura,
        fc.cliente_id,
        fc.tipo_factura,
        fc.fecha_factura,
        fc.fecha_vencimiento,
        fc.subtotal,
        fc.descuento,
        fc.itbis,
        fc.total,
        fc.estado,
        fc.created_at,
        c.nombre as cliente_nombre,
        c.apellidos as cliente_apellidos,
        c.telefono as cliente_telefono,
        c.email as cliente_email
      FROM facturas_clientes fc
      LEFT JOIN clientes c ON fc.cliente_id = c.id
      WHERE fc.id = ${facturaId}::uuid OR fc.numero_factura = ${numeroFactura}
    `);

    // Verificar si existe cuenta por cobrar
    const resultCuenta = await db.execute(sql`
      SELECT 
        id,
        factura_id,
        cliente_id,
        numero_documento,
        fecha_emision,
        fecha_vencimiento,
        monto_original,
        monto_pendiente,
        estado,
        created_at
      FROM cuentas_por_cobrar
      WHERE factura_id = ${facturaId}::uuid OR numero_documento = ${numeroFactura}
    `);

    // Verificar si el cliente tiene suscripción
    const resultSuscripcion = await db.execute(sql`
      SELECT 
        s.id,
        s.numero_contrato,
        s.dia_facturacion,
        s.estado
      FROM suscripciones s
      WHERE s.cliente_id = (
        SELECT cliente_id FROM facturas_clientes WHERE id = ${facturaId}::uuid
      )
      LIMIT 1
    `);

    return NextResponse.json({
      success: true,
      factura: {
        encontrada: resultFactura.rows.length > 0,
        datos: resultFactura.rows[0] || null,
      },
      cuentaPorCobrar: {
        encontrada: resultCuenta.rows.length > 0,
        datos: resultCuenta.rows[0] || null,
        problema: resultCuenta.rows.length === 0 ? "❌ NO EXISTE cuenta por cobrar para esta factura" : null,
      },
      suscripcion: {
        encontrada: resultSuscripcion.rows.length > 0,
        datos: resultSuscripcion.rows[0] || null,
      },
      diagnostico: {
        facturaExiste: resultFactura.rows.length > 0,
        tieneCuentaPorCobrar: resultCuenta.rows.length > 0,
        estadoFactura: resultFactura.rows[0]?.estado,
        problemaIdentificado: resultCuenta.rows.length === 0 
          ? "La factura existe pero NO tiene cuenta por cobrar. El endpoint /facturas/pendientes requiere que exista una cuenta por cobrar."
          : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
