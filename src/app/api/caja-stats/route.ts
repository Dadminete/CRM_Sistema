import { NextResponse } from "next/server";

import { and, eq, inArray, or, sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
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
  start: string;
  end: string;
};

function buildLastMonthRanges(count = 3): MonthRange[] {
  const currentParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  const year = Number(currentParts.find((part) => part.type === "year")?.value);
  const month = Number(currentParts.find((part) => part.type === "month")?.value);

  return Array.from({ length: count }, (_, index) => {
    const offset = count - index - 1;
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    const nextMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));

    return {
      label: `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
      start: date.toISOString().slice(0, 10),
      end: nextMonth.toISOString().slice(0, 10),
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

async function getTraspasoCatId(): Promise<string | null> {
  const traspasoCat = await db
    .select({ id: categoriasCuentas.id })
    .from(categoriasCuentas)
    .where(eq(categoriasCuentas.codigo, "TRASP-001"))
    .limit(1);
  return traspasoCat[0]?.id ?? null;
}

function getCashboxCondition(cajaIds: string[]) {
  return cajaIds.length
    ? sql`${movimientosContables.cajaId} IN (${sql.join(
        cajaIds.map((id) => sql`${id}`),
        sql`, `,
      )})`
    : sql`FALSE`;
}

async function getMonthlyBreakdown(cajaIds: string[], start: string, end: string, traspasoCatId: string | null) {
  const expensesCondition = sql`LOWER(${movimientosContables.tipo}) IN ('gasto', 'egreso')`;
  const cashboxCondition = getCashboxCondition(cajaIds);
  const result = await db
    .select({
      ingresosCaja: sql<number>`COALESCE(SUM(CASE
        WHEN LOWER(${movimientosContables.tipo}) = 'ingreso'
          AND ${cashboxCondition}
          AND ${movimientosContables.cuentaBancariaId} IS NULL
        THEN CAST(${movimientosContables.monto} AS DECIMAL) ELSE 0 END), 0)`,
      ingresosBanco: sql<number>`COALESCE(SUM(CASE
        WHEN LOWER(${movimientosContables.tipo}) = 'ingreso'
          AND ${movimientosContables.cuentaBancariaId} IS NOT NULL
        THEN CAST(${movimientosContables.monto} AS DECIMAL) ELSE 0 END), 0)`,
      gastosCaja: sql<number>`COALESCE(SUM(CASE
        WHEN ${expensesCondition}
          AND ${cashboxCondition}
          AND ${movimientosContables.cuentaBancariaId} IS NULL
        THEN CAST(${movimientosContables.monto} AS DECIMAL) ELSE 0 END), 0)`,
      gastosBanco: sql<number>`COALESCE(SUM(CASE
        WHEN ${expensesCondition}
          AND ${movimientosContables.cuentaBancariaId} IS NOT NULL
        THEN CAST(${movimientosContables.monto} AS DECIMAL) ELSE 0 END), 0)`,
    })
    .from(movimientosContables)
    .where(
      and(
        or(inArray(movimientosContables.cajaId, cajaIds), sql`${movimientosContables.cuentaBancariaId} IS NOT NULL`),
        traspasoCatId ? sql`${movimientosContables.categoriaId} IS DISTINCT FROM ${traspasoCatId}` : sql`TRUE`,
        sql`${movimientosContables.fecha} >= (${start}::date::timestamp AT TIME ZONE 'America/Santo_Domingo')`,
        sql`${movimientosContables.fecha} < (${end}::date::timestamp AT TIME ZONE 'America/Santo_Domingo')`,
      ),
    );

  const row = result[0];
  return {
    ingresosCaja: Number(row?.ingresosCaja ?? 0),
    ingresosBanco: Number(row?.ingresosBanco ?? 0),
    gastosCaja: Number(row?.gastosCaja ?? 0),
    gastosBanco: Number(row?.gastosBanco ?? 0),
  };
}

async function getCashStats() {
  try {
    const cajaIds = await getCajaIds();
    const saldoTotal = cajaIds.length ? await getSaldoTotal(cajaIds) : 0;
    const traspasoCatId = await getTraspasoCatId();

    const ultimosMeses = await Promise.all(
      buildLastMonthRanges(4).map(async ({ label, start, end }) => {
        const breakdown = await getMonthlyBreakdown(cajaIds, start, end, traspasoCatId);
        return { mes: label, ...breakdown };
      }),
    );

    return NextResponse.json({ success: true, data: { saldoTotal, ultimosMeses } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching caja stats:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const GET = withAuth(async () => getCashStats(), { requiredPermission: "cajas.dashboard" });
