import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    console.log("Creating caja_checkpoints table...");
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS caja_checkpoints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        caja_id UUID NOT NULL REFERENCES cajas(id),
        descripcion VARCHAR(255) NOT NULL,
        saldo_establecido NUMERIC(15, 2) NOT NULL,
        total_ingresos NUMERIC(15, 2) NOT NULL,
        total_gastos NUMERIC(15, 2) NOT NULL,
        cantidad_movimientos INTEGER NOT NULL,
        fecha_checkpoint TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        creado_por UUID REFERENCES usuarios(id),
        notas TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS caja_checkpoints_caja_id_idx ON caja_checkpoints(caja_id);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS caja_checkpoints_fecha_checkpoint_idx ON caja_checkpoints(fecha_checkpoint);
    `);

    console.log("✅ Table created successfully");

    return NextResponse.json({
      success: true,
      message: "Tabla caja_checkpoints creada exitosamente"
    });
  } catch (error: any) {
    console.error("Error creating table:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
