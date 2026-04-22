import { db } from "@/lib/db";
import { movimientosContables, cajas } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { idsToDelete, cajaId, newBalance } = body;

    if (!idsToDelete || !Array.isArray(idsToDelete) || idsToDelete.length === 0) {
      return NextResponse.json(
        { success: false, error: "No IDs provided to delete" },
        { status: 400 }
      );
    }

    // Delete duplicate movements
    const deleted = await db
      .delete(movimientosContables)
      .where(inArray(movimientosContables.id, idsToDelete))
      .returning();

    // Update caja balance if provided
    if (cajaId && newBalance !== undefined) {
      await db
        .update(cajas)
        .set({
          saldoActual: newBalance.toString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(cajas.id, cajaId));
    }

    return NextResponse.json({
      success: true,
      deletedCount: deleted.length,
      deletedMovements: deleted.map((m) => ({
        id: m.id,
        fecha: m.fecha,
        monto: m.monto,
        descripcion: m.descripcion,
      })),
      newBalance: newBalance,
    });
  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
