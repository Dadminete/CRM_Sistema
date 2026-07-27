import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { categoriasCuentas } from "@/lib/db/schema";

export type DashboardMovement = {
  id: string;
  tipo: string;
  monto: number;
  descripcion: string | null;
  fecha: string;
  origen: string;
  origenTipo: "caja" | "banco" | "otro";
  categoria: string | null;
  metodo: string | null;
};

export type DashboardCaja = {
  id: string;
  nombre: string;
  tipo: string;
  saldoActual: number;
  ingresosMes: number;
  gastosMes: number;
  movimientos: number;
};

export type DashboardCuentaBancaria = {
  id: string;
  nombre: string;
  banco: string;
  numeroCuenta: string;
  saldoActual: number;
  ingresosMes: number;
  gastosMes: number;
  movimientos: number;
};

export type AccountingDashboardData = {
  periodLabel: string;
  periodSummary: {
    ingresos: number;
    gastos: number;
    balance: number;
    ingresosMes: number;
    gastosMes: number;
    balanceMes: number;
    movimientos: number;
    cajasSaldo: number;
    bancosSaldo: number;
    ahorroPct: number;
    gastoPct: number;
  };
  cajas: DashboardCaja[];
  cuentasBancarias: DashboardCuentaBancaria[];
  recentMovements: DashboardMovement[];
  categories: Array<{ nombre: string; tipo: "ingreso" | "gasto"; total: number; count: number }>;
};

type DashboardMovementInput = {
  id: string;
  tipo: string;
  monto: number;
  descripcion?: string | null;
  fecha: string;
  origen: string;
  origenTipo: "caja" | "banco" | "otro";
  categoria?: string | null;
  metodo?: string | null;
};

type DashboardCajaInput = {
  id: string;
  nombre: string;
  tipo: string;
  saldoActual: number;
  ingresosMes: number;
  gastosMes: number;
  movimientos: number;
};

type DashboardCuentaBancariaInput = {
  id: string;
  nombre: string;
  banco: string;
  numeroCuenta: string;
  saldoActual: number;
  ingresosMes: number;
  gastosMes: number;
  movimientos: number;
};

function toNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function toPercent(value: number) {
  return Math.round(value * 100) / 100;
}

export function buildAccountingDashboardMetrics(params: {
  movements: DashboardMovementInput[];
  cajas: DashboardCajaInput[];
  cuentasBancarias: DashboardCuentaBancariaInput[];
  periodLabel?: string;
}) {
  const ingresos = params.movements
    .filter((item) => item.tipo.toLowerCase() === "ingreso")
    .reduce((sum, item) => sum + item.monto, 0);
  const gastos = params.movements
    .filter((item) => item.tipo.toLowerCase() === "gasto" || item.tipo.toLowerCase() === "egreso")
    .reduce((sum, item) => sum + item.monto, 0);
  const balance = ingresos - gastos;
  const ingresosMes = params.movements
    .filter((item) => item.tipo.toLowerCase() === "ingreso")
    .reduce((sum, item) => sum + item.monto, 0);
  const gastosMes = params.movements
    .filter((item) => item.tipo.toLowerCase() === "gasto" || item.tipo.toLowerCase() === "egreso")
    .reduce((sum, item) => sum + item.monto, 0);
  const balanceMes = ingresosMes - gastosMes;
  const ahorroPct = ingresosMes > 0 ? toPercent((balanceMes / ingresosMes) * 100) : 0;
  const gastoPct = ingresosMes > 0 ? toPercent((gastosMes / ingresosMes) * 100) : gastosMes > 0 ? 100 : 0;

  const categories = Array.from(
    params.movements.reduce<Map<string, { nombre: string; tipo: "ingreso" | "gasto"; total: number; count: number }>>(
      (acc, item) => {
        const tipo = item.tipo.toLowerCase() === "ingreso" ? "ingreso" : "gasto";
        const key = `${tipo}:${item.categoria ?? "Sin categoría"}`;
        const existing = acc.get(key) ?? { nombre: item.categoria ?? "Sin categoría", tipo, total: 0, count: 0 };
        existing.total += item.monto;
        existing.count += 1;
        acc.set(key, existing);
        return acc;
      },
      new Map(),
    ),
    ([, value]) => value,
  ).sort((a, b) => b.total - a.total);

  return {
    periodLabel: params.periodLabel ?? "Mes actual",
    periodSummary: {
      ingresos,
      gastos,
      balance,
      ingresosMes,
      gastosMes,
      balanceMes,
      movimientos: params.movements.length,
      cajasSaldo: params.cajas.reduce((sum, caja) => sum + caja.saldoActual, 0),
      bancosSaldo: params.cuentasBancarias.reduce((sum, cuenta) => sum + cuenta.saldoActual, 0),
      ahorroPct,
      gastoPct,
    },
    cajas: params.cajas,
    cuentasBancarias: params.cuentasBancarias,
    recentMovements: params.movements
      .slice()
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 10),
    categories,
  };
}

export async function getAccountingDashboardData(): Promise<AccountingDashboardData> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  try {
    const traspasoCatRows = await db
      .select({ id: categoriasCuentas.id })
      .from(categoriasCuentas)
      .where(sql`${categoriasCuentas.codigo} = 'TRASP-001'`)
      .limit(1);
    const traspasoCatId = traspasoCatRows[0]?.id ?? null;

    const [cajasRaw, cuentasRaw, movementsRaw] = await Promise.all([
      db.execute(sql`
        SELECT
          c.id,
          c.nombre,
          c.tipo,
          COALESCE(c.saldo_inicial, 0) AS saldo_inicial,
          COALESCE(c.saldo_actual, 0) AS saldo_actual,
          COALESCE(SUM(CASE WHEN mc.tipo = 'ingreso' THEN CAST(mc.monto AS NUMERIC) ELSE 0 END), 0) AS ingresos_mes,
          COALESCE(SUM(CASE WHEN mc.tipo IN ('gasto', 'egreso') THEN CAST(mc.monto AS NUMERIC) ELSE 0 END), 0) AS gastos_mes,
          COUNT(mc.id) AS movimientos
        FROM cajas c
        LEFT JOIN movimientos_contables mc
          ON mc.caja_id = c.id
          AND mc.fecha >= ${monthStart.toISOString()}
          AND mc.fecha <= ${monthEnd.toISOString()}
          ${traspasoCatId ? sql`AND mc.categoria_id <> ${traspasoCatId}` : sql``}
        WHERE c.activa = true
        GROUP BY c.id, c.nombre, c.tipo, c.saldo_inicial, c.saldo_actual
        ORDER BY c.nombre ASC
      `),
      db.execute(sql`
        SELECT
          cb.id,
          cb.numero_cuenta AS numero_cuenta,
          b.nombre AS banco,
          cb.tipo_cuenta,
          COALESCE(cc.saldo_inicial, 0) AS saldo_inicial,
          COALESCE(cc.saldo_actual, 0) AS saldo_actual,
          COALESCE(SUM(CASE WHEN mc.tipo = 'ingreso' THEN CAST(mc.monto AS NUMERIC) ELSE 0 END), 0) AS ingresos_total,
          COALESCE(SUM(CASE WHEN mc.tipo IN ('gasto', 'egreso') THEN CAST(mc.monto AS NUMERIC) ELSE 0 END), 0) AS gastos_total,
          COALESCE(SUM(CASE WHEN mc.tipo = 'ingreso' AND mc.fecha >= ${monthStart.toISOString()} AND mc.fecha <= ${monthEnd.toISOString()} THEN CAST(mc.monto AS NUMERIC) ELSE 0 END), 0) AS ingresos_mes,
          COALESCE(SUM(CASE WHEN mc.tipo IN ('gasto', 'egreso') AND mc.fecha >= ${monthStart.toISOString()} AND mc.fecha <= ${monthEnd.toISOString()} THEN CAST(mc.monto AS NUMERIC) ELSE 0 END), 0) AS gastos_mes,
          COUNT(mc.id) AS movimientos
        FROM cuentas_bancarias cb
        INNER JOIN banks b ON b.id = cb.bank_id
        INNER JOIN cuentas_contables cc ON cc.id = cb.cuenta_contable_id
        LEFT JOIN movimientos_contables mc
          ON mc.cuenta_bancaria_id = cb.id
          ${traspasoCatId ? sql`AND mc.categoria_id <> ${traspasoCatId}` : sql``}
        WHERE cb.activo = true
        GROUP BY cb.id, cb.numero_cuenta, b.nombre, cb.tipo_cuenta, cc.saldo_inicial, cc.saldo_actual
        ORDER BY b.nombre ASC, cb.numero_cuenta ASC
      `),
      db.execute(sql`
        SELECT
          mc.id,
          mc.tipo,
          CAST(mc.monto AS NUMERIC) AS monto,
          mc.descripcion,
          mc.fecha,
          CASE
            WHEN mc.caja_id IS NOT NULL THEN COALESCE(c.nombre, 'Caja')
            WHEN mc.cuenta_bancaria_id IS NOT NULL THEN COALESCE(CONCAT(b.nombre, ' - ', cb.numero_cuenta), 'Cuenta bancaria')
            ELSE 'Otro origen'
          END AS origen,
          CASE
            WHEN mc.caja_id IS NOT NULL THEN 'caja'
            WHEN mc.cuenta_bancaria_id IS NOT NULL THEN 'banco'
            ELSE 'otro'
          END AS origen_tipo,
          cc.nombre AS categoria,
          mc.metodo
        FROM movimientos_contables mc
        LEFT JOIN cajas c ON c.id = mc.caja_id
        LEFT JOIN cuentas_bancarias cb ON cb.id = mc.cuenta_bancaria_id
        LEFT JOIN banks b ON b.id = cb.bank_id
        LEFT JOIN categorias_cuentas cc ON cc.id = mc.categoria_id
        WHERE mc.fecha >= ${monthStart.toISOString()}
          AND mc.fecha <= ${monthEnd.toISOString()}
          AND (mc.caja_id IS NOT NULL OR mc.cuenta_bancaria_id IS NOT NULL)
          ${traspasoCatId ? sql`AND mc.categoria_id <> ${traspasoCatId}` : sql``}
        ORDER BY mc.fecha DESC
        LIMIT 20
      `),
    ]);

    const cajasData = (cajasRaw.rows ?? []).map((row) => {
      const saldoInicial = toNumber(row.saldo_inicial);
      const saldoActualPersistido = toNumber(row.saldo_actual);
      const ingresosMes = toNumber(row.ingresos_mes);
      const gastosMes = toNumber(row.gastos_mes);
      return {
        id: String(row.id),
        nombre: String(row.nombre),
        tipo: String(row.tipo ?? "efectivo"),
        saldoActual: saldoActualPersistido > 0 ? saldoActualPersistido : saldoInicial + ingresosMes - gastosMes,
        ingresosMes,
        gastosMes,
        movimientos: toNumber(row.movimientos),
      } satisfies DashboardCaja;
    });

    const cuentasData = (cuentasRaw.rows ?? []).map((row) => {
      const saldoInicial = toNumber(row.saldo_inicial);
      const ingresosTotal = toNumber(row.ingresos_total);
      const gastosTotal = toNumber(row.gastos_total);
      const ingresosMes = toNumber(row.ingresos_mes);
      const gastosMes = toNumber(row.gastos_mes);
      const computedBalance = saldoInicial + ingresosTotal - gastosTotal;
      return {
        id: String(row.id),
        nombre: String(row.banco ?? "Cuenta"),
        banco: String(row.banco ?? "Banco"),
        numeroCuenta: String(row.numero_cuenta ?? "-"),
        saldoActual: computedBalance,
        ingresosMes,
        gastosMes,
        movimientos: toNumber(row.movimientos),
      } satisfies DashboardCuentaBancaria;
    });

    const movementsData = (movementsRaw.rows ?? []).map((row) => ({
      id: String(row.id),
      tipo: String(row.tipo ?? "ingreso"),
      monto: toNumber(row.monto),
      descripcion: row.descripcion != null ? String(row.descripcion) : null,
      fecha: String(row.fecha ?? new Date().toISOString()),
      origen: String(row.origen ?? "Sin origen"),
      origenTipo: (row.origen_tipo as "caja" | "banco" | "otro") ?? "otro",
      categoria: row.categoria != null ? String(row.categoria) : null,
      metodo: row.metodo != null ? String(row.metodo) : null,
    })) satisfies DashboardMovement[];

    return buildAccountingDashboardMetrics({
      movements: movementsData,
      cajas: cajasData,
      cuentasBancarias: cuentasData,
      periodLabel: `Mes ${now.toLocaleDateString("es-DO", { month: "long" })}`,
    });
  } catch {
    return buildAccountingDashboardMetrics({
      movements: [],
      cajas: [],
      cuentasBancarias: [],
      periodLabel: `Mes ${now.toLocaleDateString("es-DO", { month: "long" })}`,
    });
  }
}
