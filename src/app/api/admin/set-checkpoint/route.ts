import { db } from "@/lib/db";
import { cajas, movimientosContables } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cajaId, montoOficial, descripcion, notas } = body;

    if (!cajaId || !montoOficial) {
      return NextResponse.json(
        { success: false, error: "cajaId y montoOficial son requeridos" },
        { status: 400 }
      );
    }

    // Get caja info
    const caja = await db.query.cajas.findFirst({
      where: eq(cajas.id, cajaId),
    });

    if (!caja) {
      return NextResponse.json({ success: false, error: "Caja no encontrada" }, { status: 404 });
    }

    // Get all movements for this caja
    const movements = await db
      .select()
      .from(movimientosContables)
      .where(eq(movimientosContables.cajaId, cajaId));

    // Calculate totals
    let totalIngresos = 0;
    let totalGastos = 0;

    movements.forEach((m) => {
      const monto = parseFloat(m.monto.toString());
      if (m.tipo === "ingreso") {
        totalIngresos += monto;
      } else {
        totalGastos += monto;
      }
    });

    const calculatedBalance = totalIngresos - totalGastos;

    // Insert checkpoint
    const checkpoint = await db.execute(
      sql`
        INSERT INTO caja_checkpoints (
          caja_id, 
          descripcion, 
          saldo_establecido, 
          total_ingresos, 
          total_gastos, 
          cantidad_movimientos,
          notas
        ) VALUES (
          ${cajaId},
          ${descripcion || `Checkpoint oficial para ${caja.nombre}`},
          ${montoOficial},
          ${totalIngresos},
          ${totalGastos},
          ${movements.length},
          ${notas || `Establecido como punto de referencia oficial. Balance: $${montoOficial}. Calculado: $${calculatedBalance.toFixed(2)}`}
        )
        RETURNING *
      `
    );

    return NextResponse.json({
      success: true,
      message: `Checkpoint establecido para ${caja.nombre}`,
      checkpoint: {
        cajaId,
        cajaNombre: caja.nombre,
        montoOficial,
        totalIngresos: totalIngresos.toFixed(2),
        totalGastos: totalGastos.toFixed(2),
        calculatedBalance: calculatedBalance.toFixed(2),
        cantidadMovimientos: movements.length,
        diferencia: (montoOficial - calculatedBalance).toFixed(2),
      },
    });
  } catch (error: any) {
    console.error("Error creating checkpoint:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
