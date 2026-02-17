import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cuentasBancarias, cuentasContables, movimientosContables } from "@/lib/db/schema";
import { and, gte, lte, sql, eq, inArray } from "drizzle-orm";

// Forzar que el endpoint sea dinámico y no se cachee
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Obtener IDs únicos de cuentas contables que están asociadas a cuentas bancarias activas
    const accountsSubquery = db
      .select({ id: cuentasBancarias.cuentaContableId })
      .from(cuentasBancarias)
      .where(eq(cuentasBancarias.activo, true));

    // 2. Sumar el saldo de esas cuentas contables únicas
    const cuentas = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${cuentasContables.saldoActual} AS DECIMAL)), 0)`,
      })
      .from(cuentasContables)
      .where(inArray(cuentasContables.id, accountsSubquery));

    const saldoTotal = Number(cuentas[0]?.total || 0);

    // 3. Obtener datos de los últimos 3 meses
    const ultimosMeses = [];
    const now = new Date();

    for (let i = 2; i >= 0; i--) {
      const fecha = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const firstDayOfMonth = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
      const lastDayOfMonth = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0, 23, 59, 59);

      const ingresosDelMes = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)`,
        })
        .from(movimientosContables)
        .where(
          and(
            eq(movimientosContables.tipo, "ingreso"),
            sql`${movimientosContables.cuentaBancariaId} IS NOT NULL`,
            gte(movimientosContables.fecha, firstDayOfMonth.toISOString()),
            lte(movimientosContables.fecha, lastDayOfMonth.toISOString()),
          ),
        );

      const gastosDelMes = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)`,
        })
        .from(movimientosContables)
        .where(
          and(
            eq(movimientosContables.tipo, "gasto"),
            sql`${movimientosContables.cuentaBancariaId} IS NOT NULL`,
            gte(movimientosContables.fecha, firstDayOfMonth.toISOString()),
            lte(movimientosContables.fecha, lastDayOfMonth.toISOString()),
          ),
        );

      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

      ultimosMeses.push({
        mes: monthNames[fecha.getMonth()],
        ingresos: Number(ingresosDelMes[0]?.total || 0),
        gastos: Number(gastosDelMes[0]?.total || 0),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        saldoTotal,
        ultimosMeses,
      },
    });
  } catch (error: any) {
    console.error("Error fetching bank stats:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
