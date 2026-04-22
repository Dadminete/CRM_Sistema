import { db } from "@/lib/db";
import { cajas, movimientosContables } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const cajaId = "c5ab2edc-d32c-494d-b454-d1731c6c31df"; // Caja Principal

    // Get all movements for this caja
    const movements = await db
      .select()
      .from(movimientosContables)
      .where(eq(movimientosContables.cajaId, cajaId));

    // Find duplicates: same tipo, monto, descripcion, keep only first occurrence (by fecha)
    const seen = new Map<string, { id: string; fecha: Date }>();
    const toDelete: string[] = [];

    movements.forEach((m) => {
      const key = `${m.tipo}-${m.monto}-${m.descripcion || "null"}`;
      const current = seen.get(key);
      const mDate = new Date(m.fecha);

      if (!current) {
        // First occurrence
        seen.set(key, { id: m.id, fecha: mDate });
      } else if (mDate < current.fecha) {
        // This one is older, keep this instead
        toDelete.push(current.id);
        seen.set(key, { id: m.id, fecha: mDate });
      } else {
        // This one is newer, delete it
        toDelete.push(m.id);
      }
    });

    console.log("Found duplicates to delete:", toDelete.length);

    // Delete duplicates one by one
    let deletedCount = 0;
    for (const id of toDelete) {
      try {
        await db
          .delete(movimientosContables)
          .where(eq(movimientosContables.id, id));
        deletedCount++;
      } catch (e) {
        console.error("Failed to delete", id, e);
      }
    }

    // Recalculate caja balance
    const remaining = await db
      .select()
      .from(movimientosContables)
      .where(eq(movimientosContables.cajaId, cajaId));

    let newBalance = 0;
    remaining.forEach((m) => {
      const monto = parseFloat(m.monto.toString());
      const change = m.tipo === "ingreso" ? monto : -monto;
      newBalance += change;
    });

    // Update caja
    await db
      .update(cajas)
      .set({
        saldoActual: newBalance.toString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(cajas.id, cajaId));

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} duplicate movements. New balance: $${newBalance.toFixed(2)}`,
      deletedCount,
      newBalance: newBalance.toFixed(2),
    });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
