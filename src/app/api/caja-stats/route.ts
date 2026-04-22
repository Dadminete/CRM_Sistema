import { NextResponse } from "next/server";

import { and, eq, gte, inArray, lte, or, sql, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { cajas, movimientosContables, categoriasCuentas } from "@/lib/db/schema";

// Forzar que el endpoint sea dinámico y no se cachee
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getTargetCajasWhere() {
  return and(
    eq(cajas.activa, true),
    or(
      sql`lower(${cajas.nombre}) = 'caja principal'`,
      sql`lower(${cajas.nombre}) = 'caja fuerte'`,
      sql`lower(${cajas.nombre}) like '%papeleria%'`,
    ),
  );
}

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

type MonthRange = {
  label: string;
  start: Date;
  end: Date;
};

function buildLastMonthRanges(count = 3): MonthRange[] {
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const offset = count - index - 1;
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);

    return {
      label: MONTH_NAMES[date.getMonth()],
      start: new Date(date.getFullYear(), date.getMonth(), 1),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59),
    };
  });
}

async function getCajaIds() {
  const rows = await db.select({ id: cajas.id }).from(cajas).where(getTargetCajasWhere());
  return rows.map((row) => row.id);
}

async function getSaldoTotal(cajaIds: string[]) {
  const cajasSaldo = await db
    .select({ total: sql<number>`COALESCE(SUM(CAST(${cajas.saldoActual} AS DECIMAL)), 0)` })
    .from(cajas)
    .where(inArray(cajas.id, cajaIds));

  return Number(cajasSaldo[0]?.total ?? 0);
}

async function getTotalsByType(cajaIds: string[], tipo: "ingreso" | "gasto", start: Date, end: Date): Promise<number> {
  const traspasoCat = await db
    .select({ id: categoriasCuentas.id })
    .from(categoriasCuentas)
    .where(eq(categoriasCuentas.codigo, "TRASP-001"))
    .limit(1);
  const traspasoCatId = traspasoCat[0]?.id ?? null;

  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)` })
    .from(movimientosContables)
    .where(
      traspasoCatId
        ? and(
            eq(movimientosContables.tipo, tipo),
            ne(movimientosContables.categoriaId, traspasoCatId),
            inArray(movimientosContables.cajaId, cajaIds),
            gte(movimientosContables.fecha, start.toISOString()),
            lte(movimientosContables.fecha, end.toISOString()),
          )
        : and(
            eq(movimientosContables.tipo, tipo),
            inArray(movimientosContables.cajaId, cajaIds),
            gte(movimientosContables.fecha, start.toISOString()),
            lte(movimientosContables.fecha, end.toISOString()),
          ),
    );

  return Number(result[0]?.total ?? 0);
}

export async function GET() {
  try {
    const cajaIds = await getCajaIds();

    if (!cajaIds.length) {
      const emptyData = { success: true, data: { saldoTotal: 0, ultimosMeses: [] } };
      return NextResponse.json(emptyData, { status: 200 });
    }

    const saldoTotal = await getSaldoTotal(cajaIds);

    const ultimosMeses = await Promise.all(
      buildLastMonthRanges(3).map(async ({ label, start, end }) => {
        const [ingresos, gastos] = await Promise.all([
          getTotalsByType(cajaIds, "ingreso", start, end),
          getTotalsByType(cajaIds, "gasto", start, end),
        ]);

        return { mes: label, ingresos, gastos };
      }),
    );

    return NextResponse.json({ success: true, data: { saldoTotal, ultimosMeses } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching caja stats:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
