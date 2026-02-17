import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ventasPapeleria, movimientosContables, categoriasCuentas, cajas, sesionesCaja } from "@/lib/db/schema";
import { and, gte, lte, sql, eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    // Obtener el primer y último día del mes actual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Obtener estado de la caja de papelería
    const cajaPapeleria = await db.select().from(cajas).where(eq(cajas.nombre, "Papelería")).limit(1);

    let estado = "cerrada";
    if (cajaPapeleria.length > 0) {
      const ultimaSesion = await db
        .select({ estado: sesionesCaja.estado })
        .from(sesionesCaja)
        .where(eq(sesionesCaja.cajaId, cajaPapeleria[0].id))
        .orderBy(desc(sesionesCaja.fechaApertura))
        .limit(1);
      estado = ultimaSesion[0]?.estado || "cerrada";
    }

    // Obtener ventas de papelería del mes actual
    const ventasDelMes = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${ventasPapeleria.total} AS DECIMAL)), 0)`,
      })
      .from(ventasPapeleria)
      .where(
        and(
          gte(ventasPapeleria.fechaVenta, firstDayOfMonth.toISOString()),
          lte(ventasPapeleria.fechaVenta, lastDayOfMonth.toISOString()),
        ),
      );

    const totalVentas = Number(ventasDelMes[0]?.total || 0);

    // Obtener gastos relacionados con papelería del mes actual
    const categoriaPapeleria = await db
      .select({ id: categoriasCuentas.id })
      .from(categoriasCuentas)
      .where(sql`LOWER(${categoriasCuentas.nombre}) LIKE '%papeleria%'`);

    let totalGastos = 0;

    if (categoriaPapeleria.length > 0) {
      const categoriaIds = categoriaPapeleria.map((c) => c.id);

      const gastosDelMes = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)`,
        })
        .from(movimientosContables)
        .where(
          and(
            eq(movimientosContables.tipo, "gasto"),
            sql`${movimientosContables.categoriaId} IN ${categoriaIds}`,
            gte(movimientosContables.fecha, firstDayOfMonth.toISOString()),
            lte(movimientosContables.fecha, lastDayOfMonth.toISOString()),
          ),
        );

      totalGastos = Number(gastosDelMes[0]?.total || 0);
    }

    // Obtener datos de los últimos 6 días
    const ultimosDias = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const startOfDay = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0);
      const endOfDay = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59);

      // Obtener ventas del día
      const ventasDelDia = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${ventasPapeleria.total} AS DECIMAL)), 0)`,
        })
        .from(ventasPapeleria)
        .where(
          and(
            gte(ventasPapeleria.fechaVenta, startOfDay.toISOString()),
            lte(ventasPapeleria.fechaVenta, endOfDay.toISOString()),
          ),
        );

      // Obtener gastos del día
      let gastosDelDia = 0;
      if (categoriaPapeleria.length > 0) {
        const categoriaIds = categoriaPapeleria.map((c) => c.id);

        const gastosResult = await db
          .select({
            total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)`,
          })
          .from(movimientosContables)
          .where(
            and(
              eq(movimientosContables.tipo, "gasto"),
              sql`${movimientosContables.categoriaId} IN ${categoriaIds}`,
              gte(movimientosContables.fecha, startOfDay.toISOString()),
              lte(movimientosContables.fecha, endOfDay.toISOString()),
            ),
          );

        gastosDelDia = Number(gastosResult[0]?.total || 0);
      }

      ultimosDias.push({
        fecha: `${fecha.getDate()}/${fecha.getMonth() + 1}`,
        ventas: Number(ventasDelDia[0]?.total || 0),
        gastos: gastosDelDia,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ventasDelMes: totalVentas,
        gastosDelMes: totalGastos,
        ultimosDias,
        estado,
      },
    });
  } catch (error: any) {
    console.error("Error fetching Papeleria stats:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
