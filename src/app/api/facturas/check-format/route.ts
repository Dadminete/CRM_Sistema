import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Ver todas las facturas y sus formatos
    const result = await db.execute(sql`
      SELECT numero_factura 
      FROM facturas_clientes 
      ORDER BY numero_factura DESC 
      LIMIT 20
    `);

    return NextResponse.json({
      facturas: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
