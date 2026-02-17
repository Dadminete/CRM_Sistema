import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const facturaId = "4572007d-7a5e-4002-a255-32d5e06d95d3";
    
    // Verificar cuenta por cobrar
    const resultCuenta = await db.execute(sql`
      SELECT * FROM cuentas_por_cobrar WHERE factura_id = ${facturaId}::uuid
    `);

    if (resultCuenta.rows.length === 0) {
      // No existe cuenta por cobrar, intentar crearla
      const facturaData = await db.execute(sql`
        SELECT 
          fc.id,
          fc.numero_factura,
          fc.cliente_id,
          fc.fecha_factura,
          fc.fecha_vencimiento,
          fc.total,
          fc.estado
        FROM facturas_clientes fc
        WHERE fc.id = ${facturaId}::uuid
      `);

      if (facturaData.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: "Factura no encontrada",
        });
      }

      const factura = facturaData.rows[0];

      // Crear cuenta por cobrar
      await db.execute(sql`
        INSERT INTO cuentas_por_cobrar (
          factura_id, cliente_id, numero_documento, fecha_emision,
          fecha_vencimiento, monto_original, monto_pendiente, estado, created_at, updated_at
        ) VALUES (
          ${factura.id}::uuid,
          ${factura.cliente_id}::uuid,
          ${factura.numero_factura},
          ${factura.fecha_factura},
          ${factura.fecha_vencimiento},
          ${factura.total},
          ${factura.total},
          'pendiente',
          NOW(),
          NOW()
        )
      `);

      return NextResponse.json({
        success: true,
        mensaje: "✅ Cuenta por cobrar creada exitosamente",
        factura: factura.numero_factura,
        monto: factura.total,
      });
    }

    return NextResponse.json({
      success: true,
      mensaje: "✅ La factura ya tiene cuenta por cobrar",
      cuenta: resultCuenta.rows[0],
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
