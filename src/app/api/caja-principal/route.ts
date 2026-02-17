import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cajas, movimientosContables, sesionesCaja } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export async function GET() {
  try {
    // Obtener Caja Principal
    const cajaPrincipal = await db.select().from(cajas).where(eq(cajas.nombre, "Caja Principal")).limit(1);

    if (!cajaPrincipal || cajaPrincipal.length === 0) {
      return NextResponse.json({ success: false, error: "Caja Principal no encontrada" }, { status: 404 });
    }

    const cajaId = cajaPrincipal[0].id;
    const balanceActual = Number(cajaPrincipal[0].saldoActual);

    // Obtener la última sesión de la caja
    const ultimaSesion = await db
      .select({ estado: sesionesCaja.estado })
      .from(sesionesCaja)
      .where(eq(sesionesCaja.cajaId, cajaId))
      .orderBy(desc(sesionesCaja.fechaApertura))
      .limit(1);

    const estado = ultimaSesion[0]?.estado || "cerrada";

    // Calcular gastos del mes actual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const gastosDelMes = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)`,
      })
      .from(movimientosContables)
      .where(
        and(
          eq(movimientosContables.cajaId, cajaId),
          eq(movimientosContables.tipo, "gasto"),
          gte(movimientosContables.fecha, firstDayOfMonth.toISOString()),
          lte(movimientosContables.fecha, lastDayOfMonth.toISOString()),
        ),
      );

    const totalGastos = Number(gastosDelMes[0]?.total || 0);

    // Obtener ingresos y gastos de los últimos 6 días
    const ultimosDias = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const startOfDay = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0);
      const endOfDay = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59);

      // Obtener ingresos del día
      const ingresosDelDia = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)`,
        })
        .from(movimientosContables)
        .where(
          and(
            eq(movimientosContables.cajaId, cajaId),
            eq(movimientosContables.tipo, "ingreso"),
            gte(movimientosContables.fecha, startOfDay.toISOString()),
            lte(movimientosContables.fecha, endOfDay.toISOString()),
          ),
        );

      // Obtener gastos del día
      const gastosDelDia = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)`,
        })
        .from(movimientosContables)
        .where(
          and(
            eq(movimientosContables.cajaId, cajaId),
            eq(movimientosContables.tipo, "gasto"),
            gte(movimientosContables.fecha, startOfDay.toISOString()),
            lte(movimientosContables.fecha, endOfDay.toISOString()),
          ),
        );

      ultimosDias.push({
        fecha: `${fecha.getDate()}/${fecha.getMonth() + 1}`,
        ingresos: Number(ingresosDelDia[0]?.total || 0),
        gastos: Number(gastosDelDia[0]?.total || 0),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        balanceActual,
        gastosDelMes: totalGastos,
        ultimosDias,
        estado,
      },
    });
  } catch (error: any) {
    console.error("Error fetching Caja Principal data:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
