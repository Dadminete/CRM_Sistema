import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db.execute(sql`
      SELECT 
        fc.id as factura_id,
        fc.numero_factura,
        fc.estado as factura_estado,
        fc.fecha_factura,
        fc.total as factura_total,
        cpc.id as cuenta_id,
        cpc.monto_pendiente,
        cpc.estado as cuenta_estado,
        c.nombre as cliente_nombre,
        c.apellidos as cliente_apellidos
      FROM facturas_clientes fc
      LEFT JOIN cuentas_por_cobrar cpc ON fc.id = cpc.factura_id
      LEFT JOIN clientes c ON fc.cliente_id = c.id
      WHERE fc.estado IN ('pendiente', 'parcial', 'pago parcial')
      AND fc.numero_factura LIKE 'FAC-2026%'
      ORDER BY fc.created_at DESC
      LIMIT 20
    `);

    const conCuenta = result.rows.filter((r: any) => r.cuenta_id);
    const sinCuenta = result.rows.filter((r: any) => !r.cuenta_id);

    return NextResponse.json({
      success: true,
      total: result.rows.length,
      conCuentaPorCobrar: conCuenta.length,
      sinCuentaPorCobrar: sinCuenta.length,
      facturas: result.rows,
      problemasDetectados: sinCuenta.map((f: any) => ({
        numeroFactura: f.numero_factura,
        problema: "Factura sin cuenta por cobrar asociada",
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
