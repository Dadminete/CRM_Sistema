import { db } from "@/lib/db";
import { cajas, movimientosContables } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { jsonResponse } from "@/lib/serializers";

export async function GET(req: Request) {
  try {
    // Get all cajas
    const allCajas = await db.query.cajas.findMany();
    
    const audit = [];

    for (const caja of allCajas) {
      // Get all movements for this caja
      const movements = await db
        .select()
        .from(movimientosContables)
        .where(eq(movimientosContables.cajaId, caja.id))
        .orderBy(desc(movimientosContables.fecha));

      // Calculate balance from movements
      let calculatedBalance = 0;
      movements.forEach((m) => {
        const monto = parseFloat(m.monto.toString());
        const change = m.tipo === "ingreso" ? monto : -monto;
        calculatedBalance += change;
      });

      const dbBalance = parseFloat(caja.saldoActual.toString());
      const difference = dbBalance - calculatedBalance;

      // Check for duplicates
      const movementMap = new Map<string, typeof movements[0][]>();
      movements.forEach((m) => {
        const key = `${m.tipo}-${m.monto}-${m.descripcion}`;
        if (!movementMap.has(key)) movementMap.set(key, []);
        movementMap.get(key)!.push(m);
      });

      let duplicates = [];
      movementMap.forEach((items, key) => {
        if (items.length > 1) {
          const timestamps = items.map((i) => new Date(i.fecha).getTime());
          const diffs = [];
          for (let i = 1; i < timestamps.length; i++) {
            diffs.push(timestamps[i] - timestamps[i - 1]);
          }
          if (diffs.some((d) => d < 60000)) {
            duplicates.push({
              descriptor: key,
              items: items.map((m) => ({
                id: m.id,
                fecha: m.fecha,
                monto: m.monto,
              })),
            });
          }
        }
      });

      audit.push({
        cajaId: caja.id,
        cajaNombre: caja.nombre,
        dbBalance: dbBalance,
        calculatedBalance: Math.round(calculatedBalance * 100) / 100,
        difference: Math.round(difference * 100) / 100,
        totalMovements: movements.length,
        recentMovements: movements.slice(0, 10).map((m) => ({
          id: m.id,
          fecha: m.fecha,
          tipo: m.tipo,
          monto: m.monto,
          descripcion: m.descripcion,
        })),
        duplicates: duplicates,
      });
    }

    return jsonResponse({
      success: true,
      data: audit,
    });
  } catch (error: any) {
    console.error("Audit error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
