import { NextResponse } from "next/server";

import { and, eq, inArray, isNull, or, sql, ne } from "drizzle-orm";

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
      label: MONTH_NAMES[date.getUTCMonth()],
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

async function getTotalsByType(
  cajaIds: string[],
  tipo: "ingreso" | "gasto",
  start: string,
  end: string,
  traspasoCatId: string | null,
): Promise<number> {
  const typeCondition =
    tipo === "ingreso"
      ? sql`LOWER(${movimientosContables.tipo}) = 'ingreso'`
      : sql`LOWER(${movimientosContables.tipo}) IN ('gasto', 'egreso')`;

  // Only caja movements — exclude any row that also has a cuentaBancariaId to avoid
  // double-counting with the unified total query.
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)` })
    .from(movimientosContables)
    .where(
      traspasoCatId
        ? and(
            typeCondition,
            ne(movimientosContables.categoriaId, traspasoCatId),
            inArray(movimientosContables.cajaId, cajaIds),
            isNull(movimientosContables.cuentaBancariaId),
            sql`${movimientosContables.fecha} >= (${start}::date AT TIME ZONE 'America/Santo_Domingo')`,
            sql`${movimientosContables.fecha} < (${end}::date AT TIME ZONE 'America/Santo_Domingo')`,
          )
        : and(
            typeCondition,
            inArray(movimientosContables.cajaId, cajaIds),
            isNull(movimientosContables.cuentaBancariaId),
            sql`${movimientosContables.fecha} >= (${start}::date AT TIME ZONE 'America/Santo_Domingo')`,
            sql`${movimientosContables.fecha} < (${end}::date AT TIME ZONE 'America/Santo_Domingo')`,
          ),
    );

  return Number(result[0]?.total ?? 0);
}

// Unified total: cajas + bank accounts, each movement counted exactly once.
// Excludes traspasos (internal transfers) from both sources.
async function getTotalIngresosUnificado(
  cajaIds: string[],
  start: string,
  end: string,
  traspasoCatId: string | null,
): Promise<number> {
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)` })
    .from(movimientosContables)
    .where(
      and(
        sql`LOWER(${movimientosContables.tipo}) = 'ingreso'`,
        traspasoCatId ? ne(movimientosContables.categoriaId, traspasoCatId) : sql`TRUE`,
        or(inArray(movimientosContables.cajaId, cajaIds), sql`${movimientosContables.cuentaBancariaId} IS NOT NULL`),
        sql`${movimientosContables.fecha} >= (${start}::date AT TIME ZONE 'America/Santo_Domingo')`,
        sql`${movimientosContables.fecha} < (${end}::date AT TIME ZONE 'America/Santo_Domingo')`,
      ),
    );
  return Number(result[0]?.total ?? 0);
}

async function getTotalGastosUnificado(
  cajaIds: string[],
  start: string,
  end: string,
  traspasoCatId: string | null,
): Promise<number> {
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)` })
    .from(movimientosContables)
    .where(
      and(
        sql`LOWER(${movimientosContables.tipo}) IN ('gasto', 'egreso')`,
        traspasoCatId ? ne(movimientosContables.categoriaId, traspasoCatId) : sql`TRUE`,
        or(inArray(movimientosContables.cajaId, cajaIds), sql`${movimientosContables.cuentaBancariaId} IS NOT NULL`),
        sql`${movimientosContables.fecha} >= (${start}::date AT TIME ZONE 'America/Santo_Domingo')`,
        sql`${movimientosContables.fecha} < (${end}::date AT TIME ZONE 'America/Santo_Domingo')`,
      ),
    );
  return Number(result[0]?.total ?? 0);
}

async function getCashStats() {
  try {
    const cajaIds = await getCajaIds();

    if (!cajaIds.length) {
      const emptyData = { success: true, data: { saldoTotal: 0, ultimosMeses: [] } };
      return NextResponse.json(emptyData, { status: 200 });
    }

    const saldoTotal = await getSaldoTotal(cajaIds);
    const traspasoCatId = await getTraspasoCatId();

    const ultimosMeses = await Promise.all(
      buildLastMonthRanges(4).map(async ({ label, start, end }) => {
        const [ingresos, gastos, totalIngresos, totalGastos] = await Promise.all([
          getTotalsByType(cajaIds, "ingreso", start, end, traspasoCatId),
          getTotalsByType(cajaIds, "gasto", start, end, traspasoCatId),
          getTotalIngresosUnificado(cajaIds, start, end, traspasoCatId),
          getTotalGastosUnificado(cajaIds, start, end, traspasoCatId),
        ]);

        return { mes: label, ingresos, gastos, totalIngresos, totalGastos };
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
