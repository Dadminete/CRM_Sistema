import { NextResponse } from "next/server";

import { and, eq, isNull, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  pagosCuentasPorPagar,
  cuentasPorPagar,
  proveedores,
  pagosPagosFijos,
  pagosFijos,
  movimientosContables,
  categoriasCuentas,
} from "@/lib/db/schema";

const BUSINESS_TIME_ZONE = "America/Santo_Domingo";

type ExpenseRecord = {
  id: string;
  fecha: string;
  monto: number;
  beneficiario: string;
  concepto: string;
  tipo: string;
  metodoPago: string;
  referencia: string | null;
  detalles: string | null;
  categoria: string;
};

type SupplierPaymentRow = {
  id: string;
  monto: string;
  fecha: string;
  metodoPago: string | null;
  referencia: string | null;
  observaciones: string | null;
  proveedorNombre: string | null;
  concepto: string | null;
  categoria: string | null;
};

type FixedPaymentRow = {
  id: string;
  monto: string;
  fecha: string;
  metodoPago: string | null;
  referencia: string | null;
  observaciones: string | null;
  nombreFijo: string | null;
  descripcionFijo: string | null;
  categoria: string | null;
};

type GeneralExpenseRow = {
  id: string;
  monto: string;
  fecha: string;
  metodoPago: string | null;
  descripcion: string | null;
  categoria: string | null;
};

function parseOptionalAmount(value: string | null) {
  return Number.parseFloat(value ?? "");
}

function hasValue(value: string) {
  return value.length > 0;
}

const datePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getDateParts(date: Date) {
  const parts = datePartsFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return { year, month, day };
}

function toDateKey(value: Date | string) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  const { year, month, day } = getDateParts(parsed);
  return `${year}-${month}-${day}`;
}

function getDefaultMonthRange() {
  const { year, month } = getDateParts(new Date());
  const monthNumber = Number.parseInt(month, 10);
  const yearNumber = Number.parseInt(year, 10);
  const lastDay = new Date(Date.UTC(yearNumber, monthNumber, 0)).getUTCDate();

  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeMethod(value: string | null | undefined) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function buildDailyStats(items: ExpenseRecord[]) {
  const totals = new Map<string, number>();

  items.forEach((item) => {
    const current = totals.get(item.fecha) ?? 0;
    totals.set(item.fecha, current + item.monto);
  });

  return Array.from(totals.entries())
    .map(([date, total]) => ({ date, total: Number(total.toFixed(2)) }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function buildCategoryStats(items: ExpenseRecord[]) {
  const totals = new Map<string, number>();

  items.forEach((item) => {
    const key = item.categoria || "Sin categoria";
    const current = totals.get(key) ?? 0;
    totals.set(key, current + item.monto);
  });

  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total: Number(total.toFixed(2)) }))
    .sort((left, right) => right.total - left.total);
}

function buildMethodStats(items: ExpenseRecord[]) {
  const totals = new Map<string, number>();

  items.forEach((item) => {
    const key = item.metodoPago || "N/A";
    const current = totals.get(key) ?? 0;
    totals.set(key, current + item.monto);
  });

  return Array.from(totals.entries())
    .map(([method, total]) => ({ method, total: Number(total.toFixed(2)) }))
    .sort((left, right) => right.total - left.total);
}

function buildFilterOptions(items: ExpenseRecord[]) {
  return {
    types: Array.from(new Set(items.map((item) => item.tipo))).sort(),
    methods: Array.from(new Set(items.map((item) => item.metodoPago).filter(hasValue))).sort(),
    categories: Array.from(new Set(items.map((item) => item.categoria).filter(hasValue))).sort(),
  };
}

// eslint-disable-next-line complexity
function matchesExpenseFilters(
  expense: ExpenseRecord,
  filters: {
    search: string;
    typeFilter: string;
    methodFilter: string;
    categoryFilter: string;
    startDate: string;
    endDate: string;
    minAmount: number;
    maxAmount: number;
  },
) {
  const normalizedSearchTarget = [
    expense.beneficiario,
    expense.concepto,
    expense.referencia ?? "",
    expense.categoria,
    expense.metodoPago,
    expense.tipo,
    expense.detalles ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const matchesSearch = !filters.search || normalizedSearchTarget.includes(filters.search);
  const matchesType =
    !filters.typeFilter || filters.typeFilter === "all" || normalizeText(expense.tipo) === filters.typeFilter;
  const matchesMethod =
    !filters.methodFilter ||
    filters.methodFilter === "all" ||
    normalizeMethod(expense.metodoPago) === filters.methodFilter;
  const matchesCategory =
    !filters.categoryFilter ||
    filters.categoryFilter === "all" ||
    normalizeText(expense.categoria) === filters.categoryFilter;
  const matchesStart = expense.fecha >= filters.startDate;
  const matchesEnd = expense.fecha <= filters.endDate;
  const matchesMin = Number.isNaN(filters.minAmount) || expense.monto >= filters.minAmount;
  const matchesMax = Number.isNaN(filters.maxAmount) || expense.monto <= filters.maxAmount;

  return (
    matchesSearch &&
    matchesType &&
    matchesMethod &&
    matchesCategory &&
    matchesStart &&
    matchesEnd &&
    matchesMin &&
    matchesMax
  );
}

function normalizeSupplierPayments(rows: SupplierPaymentRow[]): ExpenseRecord[] {
  return rows.map((payment) => ({
    id: payment.id,
    fecha: toDateKey(payment.fecha),
    monto: Number.parseFloat(payment.monto),
    beneficiario: payment.proveedorNombre ?? "Proveedor Desconocido",
    concepto: payment.concepto ?? "Pago a proveedor",
    tipo: "PROVEEDOR",
    metodoPago: payment.metodoPago ?? "N/A",
    referencia: payment.referencia ?? null,
    detalles: payment.observaciones ?? null,
    categoria: payment.categoria ?? "Facturas por pagar",
  }));
}

function normalizeFixedPayments(rows: FixedPaymentRow[]): ExpenseRecord[] {
  return rows.map((payment) => ({
    id: payment.id,
    fecha: toDateKey(payment.fecha),
    monto: Number.parseFloat(payment.monto),
    beneficiario: payment.nombreFijo ?? "Pago Fijo",
    concepto: payment.descripcionFijo ?? "Pago recurrente",
    tipo: "FIJO",
    metodoPago: payment.metodoPago ?? "N/A",
    referencia: payment.referencia ?? null,
    detalles: payment.observaciones ?? null,
    categoria: payment.categoria ?? "Gastos fijos",
  }));
}

function normalizeGeneralExpenses(rows: GeneralExpenseRow[]): ExpenseRecord[] {
  return rows.map((expense) => ({
    id: expense.id,
    fecha: toDateKey(expense.fecha),
    monto: Number.parseFloat(expense.monto),
    beneficiario: "Gasto General",
    concepto: expense.descripcion ?? "Movimiento contable",
    tipo: "OTRO",
    metodoPago: expense.metodoPago ?? "N/A",
    referencia: null,
    detalles: null,
    categoria: expense.categoria ?? "Contabilidad general",
  }));
}

// eslint-disable-next-line complexity
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const defaultRange = getDefaultMonthRange();
    const startDate = searchParams.get("startDate")?.trim() ?? defaultRange.startDate;
    const endDate = searchParams.get("endDate")?.trim() ?? defaultRange.endDate;
    const search = normalizeText(searchParams.get("search"));
    const typeFilter = normalizeText(searchParams.get("type"));
    const methodFilter = normalizeMethod(searchParams.get("method"));
    const categoryFilter = normalizeText(searchParams.get("category"));
    const minAmount = parseOptionalAmount(searchParams.get("minAmount"));
    const maxAmount = parseOptionalAmount(searchParams.get("maxAmount"));
    const sortBy = searchParams.get("sortBy") === "amount" ? "amount" : "date";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const traspasoCat = await db
      .select({ id: categoriasCuentas.id })
      .from(categoriasCuentas)
      .where(eq(categoriasCuentas.codigo, "TRASP-001"))
      .limit(1);
    const traspasoCatId = traspasoCat[0]?.id ?? null;

    // 1. Fetch Supplier Payments (Pagos a Proveedores)
    const supplierPaymentsPromise = db
      .select({
        id: pagosCuentasPorPagar.id,
        monto: pagosCuentasPorPagar.monto,
        fecha: pagosCuentasPorPagar.fechaPago,
        metodoPago: pagosCuentasPorPagar.metodoPago,
        referencia: pagosCuentasPorPagar.numeroReferencia,
        observaciones: pagosCuentasPorPagar.observaciones,
        proveedorNombre: proveedores.nombre,
        concepto: cuentasPorPagar.concepto,
        categoria: cuentasPorPagar.tipoDocumento,
      })
      .from(pagosCuentasPorPagar)
      .leftJoin(cuentasPorPagar, eq(pagosCuentasPorPagar.cuentaPorPagarId, cuentasPorPagar.id))
      .leftJoin(proveedores, eq(cuentasPorPagar.proveedorId, proveedores.id));

    // 2. Fetch Fixed Payments (Pagos Fijos)
    const fixedPaymentsPromise = db
      .select({
        id: pagosPagosFijos.id,
        monto: pagosPagosFijos.montoPagado,
        fecha: pagosPagosFijos.fechaPago,
        metodoPago: pagosPagosFijos.metodoPago,
        referencia: pagosPagosFijos.numeroReferencia,
        observaciones: pagosPagosFijos.observaciones,
        nombreFijo: pagosFijos.nombre,
        descripcionFijo: pagosFijos.descripcion,
        categoria: pagosFijos.nombre,
      })
      .from(pagosPagosFijos)
      .leftJoin(pagosFijos, eq(pagosPagosFijos.pagoFijoId, pagosFijos.id));

    // 3. Fetch General Accounting Expenses (Gastos Generales)
    // Exclude those that might be linked to AP (though schema link is on the movement table, we filter for NULL to be safe/distinct if used that way)
    const generalExpensesPromise = db
      .select({
        id: movimientosContables.id,
        monto: movimientosContables.monto,
        fecha: movimientosContables.fecha,
        metodoPago: movimientosContables.metodo,
        descripcion: movimientosContables.descripcion,
        tipo: movimientosContables.tipo,
        cuentaPorPagarId: movimientosContables.cuentaPorPagarId,
        categoria: categoriasCuentas.nombre,
        categoriaId: movimientosContables.categoriaId,
      })
      .from(movimientosContables)
      .leftJoin(categoriasCuentas, eq(movimientosContables.categoriaId, categoriasCuentas.id))
      .where(
        traspasoCatId
          ? and(
              eq(movimientosContables.tipo, "gasto"),
              isNull(movimientosContables.cuentaPorPagarId),
              ne(movimientosContables.categoriaId, traspasoCatId),
            )
          : and(eq(movimientosContables.tipo, "gasto"), isNull(movimientosContables.cuentaPorPagarId)),
      );

    const [supplierPayments, fixedPayments, generalExpenses] = await Promise.all([
      supplierPaymentsPromise,
      fixedPaymentsPromise,
      generalExpensesPromise,
    ]);

    // Normalize Data
    const normalizedExpenses: ExpenseRecord[] = [
      ...normalizeSupplierPayments(supplierPayments),
      ...normalizeFixedPayments(fixedPayments),
      ...normalizeGeneralExpenses(generalExpenses),
    ];

    const transferFilteredExpenses = normalizedExpenses.filter((expense) => {
      if (!traspasoCatId) {
        return true;
      }

      const matchedTransfer = isTransferMovementRecord({
        tipo: "gasto",
        categoriaId: expense.categoria ? null : null,
        descripcion: expense.concepto,
        transferCategoryId: traspasoCatId,
      });

      return !matchedTransfer;
    });

    const filteredExpenses = transferFilteredExpenses.filter((expense) =>
      matchesExpenseFilters(expense, {
        search,
        typeFilter,
        methodFilter,
        categoryFilter,
        startDate,
        endDate,
        minAmount,
        maxAmount,
      }),
    );

    filteredExpenses.sort((left, right) => {
      if (sortBy === "amount") {
        return sortOrder === "asc" ? left.monto - right.monto : right.monto - left.monto;
      }

      const dateComparison = left.fecha.localeCompare(right.fecha);
      return sortOrder === "asc" ? dateComparison : -dateComparison;
    });

    const totalAmount = filteredExpenses.reduce((sum, item) => sum + item.monto, 0);
    const count = filteredExpenses.length;
    const average = count > 0 ? totalAmount / count : 0;

    const dailyStats = buildDailyStats(filteredExpenses);
    const categoryStats = buildCategoryStats(filteredExpenses);
    const methodStats = buildMethodStats(filteredExpenses);
    const filterOptions = buildFilterOptions(normalizedExpenses);

    return NextResponse.json({
      success: true,
      data: filteredExpenses,
      dailyStats,
      categoryStats,
      methodStats,
      filterOptions,
      summary: {
        total: Math.round(totalAmount * 100) / 100,
        count,
        average: Math.round(average * 100) / 100,
        range: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error al cargar gastos" },
      { status: 500 },
    );
  }
}
