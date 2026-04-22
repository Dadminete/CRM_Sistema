import { db } from "@/lib/db";
import { cajas, movimientosContables } from "@/lib/db/schema";
import { eq, sql, gt } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cajaId = searchParams.get("cajaId");

    if (!cajaId) {
      return NextResponse.json(
        { success: false, error: "cajaId es requerido" },
        { status: 400 }
      );
    }

    // Get caja
    const caja = await db.query.cajas.findFirst({
      where: eq(cajas.id, cajaId),
    });

    if (!caja) {
      return NextResponse.json({ success: false, error: "Caja no encontrada" }, { status: 404 });
    }

    // Get latest checkpoint
    const latestCheckpoint = await db.execute(
      sql`SELECT * FROM caja_checkpoints WHERE caja_id = ${cajaId} ORDER BY fecha_checkpoint DESC LIMIT 1`
    );

    if ((latestCheckpoint.rows || []).length === 0) {
      return NextResponse.json({
        success: false,
        error: "No hay checkpoint establecido para esta caja. Ejecuta /api/admin/set-checkpoint primero.",
      }, { status: 400 });
    }

    const checkpoint = (latestCheckpoint.rows as any[])[0];

    // Get all movements AFTER checkpoint
    const movements = await db
      .select()
      .from(movimientosContables)
      .where(
        sql`${movimientosContables.cajaId} = ${cajaId} AND ${movimientosContables.fecha} > ${checkpoint.fecha_checkpoint}`
      );

    // Calculate changes since checkpoint
    let ingresosPostCheckpoint = 0;
    let gastosPostCheckpoint = 0;

    movements.forEach((m) => {
      const monto = parseFloat(m.monto.toString());
      if (m.tipo === "ingreso") {
        ingresosPostCheckpoint += monto;
      } else {
        gastosPostCheckpoint += monto;
      }
    });

    // Calculate expected balance
    const expectedBalance = 
      parseFloat(checkpoint.saldo_establecido) + 
      ingresosPostCheckpoint - 
      gastosPostCheckpoint;

    const currentBalance = parseFloat(caja.saldoActual.toString());
    const discrepancia = currentBalance - expectedBalance;

    return NextResponse.json({
      success: true,
      data: {
        cashBox: {
          id: caja.id,
          nombre: caja.nombre,
          balanceActual: currentBalance,
        },
        checkpoint: {
          fecha: checkpoint.fecha_checkpoint,
          descripcion: checkpoint.descripcion,
          balanceOficial: parseFloat(checkpoint.saldo_establecido),
          totalIngresosAlCheckpoint: parseFloat(checkpoint.total_ingresos),
          totalGastosAlCheckpoint: parseFloat(checkpoint.total_gastos),
          movimientosAlCheckpoint: checkpoint.cantidad_movimientos,
          notas: checkpoint.notas,
        },
        auditoria: {
          movimientosPostCheckpoint: movements.length,
          ingresosPostCheckpoint,
          gastosPostCheckpoint,
          expectedBalance,
          currentBalance,
          discrepancia,
          estado: Math.abs(discrepancia) < 0.01 ? "✅ VÁLIDO" : `⚠️ DESCUADRE DE $${Math.abs(discrepancia).toFixed(2)}`,
        },
        movimientosPostCheckpoint: movements.map((m) => ({
          id: m.id,
          fecha: m.fecha,
          tipo: m.tipo,
          monto: m.monto,
          descripcion: m.descripcion,
        })),
      },
    });
  } catch (error: any) {
    console.error("Error auditing checkpoint:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
