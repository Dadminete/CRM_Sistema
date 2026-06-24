import { NextRequest, NextResponse } from "next/server";

import { eq, sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import {
  pagosClientes,
  clientes,
  movimientosContables,
  categoriasCuentas,
  ventasPapeleria,
  usuarios,
} from "@/lib/db/schema";

const BUSINESS_TIME_ZONE = "America/Santo_Domingo";

type IncomeRecord = {
  id: string;
  monto: number;
  fecha: string;
  metodo: string;
  referencia: string | null;
  cliente: string;
  cobrador: string;
  tipo: string;
  descripcion: string;
  origen: string;
  categoria: string;
};

type PaymentRow = {
  id: string;
  monto: string;
  fecha: string;
  metodo: string | null;
  referencia: string | null;
  cliente: string | null;
  cobrador: string | null;
  descripcion: string | null;
  categoria: string | null;
};

type StationerySaleRow = PaymentRow;

type MovementRow = {
  id: string;
  monto: string;
  fecha: string;
  metodo: string | null;
  referencia: string | null;
  cobrador: string | null;
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

function buildDailyStats(items: IncomeRecord[]) {
  const totals = new Map<string, number>();

  items.forEach((item) => {
    const current = totals.get(item.fecha) ?? 0;
    totals.set(item.fecha, current + item.monto);
  });

  return Array.from(totals.entries())
    .map(([date, total]) => ({ date, total: Number(total.toFixed(2)) }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function buildCategoryStats(items: IncomeRecord[]) {
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

function buildMethodStats(items: IncomeRecord[]) {
  const totals = new Map<string, number>();

  items.forEach((item) => {
    const key = item.metodo || "N/A";
    const current = totals.get(key) ?? 0;
    totals.set(key, current + item.monto);
  });

  return Array.from(totals.entries())
    .map(([method, total]) => ({ method, total: Number(total.toFixed(2)) }))
    .sort((left, right) => right.total - left.total);
}

function buildFilterOptions(items: IncomeRecord[]) {
  return {
    types: Array.from(new Set(items.map((item) => item.tipo))).sort(),
    methods: Array.from(new Set(items.map((item) => item.metodo).filter(hasValue))).sort(),
    categories: Array.from(new Set(items.map((item) => item.categoria).filter(hasValue))).sort(),
  };
}

// eslint-disable-next-line complexity
function matchesIncomeFilters(
  income: IncomeRecord,
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
    income.cliente,
    income.descripcion,
    income.referencia ?? "",
    income.categoria,
    income.metodo,
    income.tipo,
    income.cobrador,
  ]
    .join(" ")
    .toLowerCase();

  const matchesSearch = !filters.search || normalizedSearchTarget.includes(filters.search);
  const matchesType =
    !filters.typeFilter || filters.typeFilter === "all" || normalizeText(income.tipo) === filters.typeFilter;
  const matchesMethod =
    !filters.methodFilter || filters.methodFilter === "all" || normalizeMethod(income.metodo) === filters.methodFilter;
  const matchesCategory =
    !filters.categoryFilter ||
    filters.categoryFilter === "all" ||
    normalizeText(income.categoria) === filters.categoryFilter;
  const matchesStart = income.fecha >= filters.startDate;
  const matchesEnd = income.fecha <= filters.endDate;
  const matchesMin = Number.isNaN(filters.minAmount) || income.monto >= filters.minAmount;
  const matchesMax = Number.isNaN(filters.maxAmount) || income.monto <= filters.maxAmount;

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

function normalizePayments(rows: PaymentRow[]): IncomeRecord[] {
  return rows.map((payment) => ({
    id: payment.id,
    monto: Number.parseFloat(payment.monto),
    fecha: toDateKey(payment.fecha),
    metodo: payment.metodo ?? "N/A",
    referencia: payment.referencia ?? null,
    cliente: payment.cliente ?? "Cliente Desconocido",
    cobrador: payment.cobrador ?? "N/A",
    tipo: "PAGO CLIENTE",
    descripcion: payment.descripcion ?? "Pago de factura",
    origen: "pagos_clientes",
    categoria: payment.categoria ?? "Cobros de clientes",
  }));
}

function normalizeStationerySales(rows: StationerySaleRow[]): IncomeRecord[] {
  return rows.map((sale) => ({
    id: sale.id,
    monto: Number.parseFloat(sale.monto),
    fecha: toDateKey(sale.fecha),
    metodo: sale.metodo ?? "N/A",
    referencia: sale.referencia ?? null,
    cliente: sale.cliente ?? "Venta de Mostrador",
    cobrador: sale.cobrador ?? "N/A",
    tipo: "VENTA PAPELERIA",
    descripcion: sale.descripcion ?? "Venta de papelería",
    origen: "ventas_papeleria",
    categoria: sale.categoria ?? "Ventas de papelería",
  }));
}

function normalizeMovements(rows: MovementRow[]): IncomeRecord[] {
  return rows.map((movement) => ({
    id: movement.id,
    monto: Number.parseFloat(movement.monto),
    fecha: toDateKey(movement.fecha),
    metodo: movement.metodo ?? "N/A",
    referencia: movement.referencia ?? null,
    cliente: "Ingreso Contable",
    cobrador: movement.cobrador ?? "N/A",
    tipo: "OTRO INGRESO",
    descripcion: movement.descripcion ?? "Movimiento contable",
    origen: "movimientos_contables",
    categoria: movement.categoria ?? "Contabilidad general",
  }));
}

export const GET = withAuth(
  async (req: NextRequest) => {
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

      // 1. Fetch Client Payments
      const paymentsQuery = db
        .select({
          id: pagosClientes.id,
          monto: pagosClientes.monto,
          fecha: pagosClientes.fechaPago,
          metodo: pagosClientes.metodoPago,
          referencia: pagosClientes.numeroReferencia,
          cliente: sql<string>`${clientes.nombre} || ' ' || ${clientes.apellidos}`,
          tipo: sql<string>`'pago_cliente'`,
          descripcion: sql<string>`'Pago de factura ' || ${pagosClientes.numeroPago}`,
          cobrador: sql<string>`${usuarios.nombre} || ' ' || ${usuarios.apellido}`,
          categoria: sql<string>`'Cobros de clientes'`,
        })
        .from(pagosClientes)
        .leftJoin(clientes, eq(pagosClientes.clienteId, clientes.id))
        .leftJoin(usuarios, eq(pagosClientes.recibidoPor, usuarios.id));

      // 2. Fetch Stationery Sales (Ventas Papeleria)
      const stationerySalesQuery = db
        .select({
          id: ventasPapeleria.id,
          monto: ventasPapeleria.total,
          fecha: ventasPapeleria.fechaVenta,
          metodo: ventasPapeleria.metodoPago,
          referencia: ventasPapeleria.numeroVenta,
          cliente: ventasPapeleria.clienteNombre,
          tipo: sql<string>`'venta_papeleria'`,
          descripcion: sql<string>`'Venta de papelería ' || ${ventasPapeleria.numeroVenta}`,
          cobrador: sql<string>`${usuarios.nombre} || ' ' || ${usuarios.apellido}`,
          categoria: sql<string>`'Ventas de papelería'`,
        })
        .from(ventasPapeleria)
        .leftJoin(usuarios, eq(ventasPapeleria.usuarioId, usuarios.id));

      // 3. Fetch Accounting Incomes
      const movementsQuery = db
        .select({
          id: movimientosContables.id,
          monto: movimientosContables.monto,
          fecha: movimientosContables.fecha,
          metodo: movimientosContables.metodo,
          referencia: sql<string>`''`,
          cliente: sql<string>`'Contabilidad'`,
          tipo: sql<string>`'movimiento_contable'`,
          descripcion: movimientosContables.descripcion,
          cobrador: sql<string>`${usuarios.nombre} || ' ' || ${usuarios.apellido}`,
          categoria: categoriasCuentas.nombre,
        })
        .from(movimientosContables)
        .leftJoin(categoriasCuentas, eq(movimientosContables.categoriaId, categoriasCuentas.id))
        .leftJoin(usuarios, eq(movimientosContables.usuarioId, usuarios.id))
        .where(eq(movimientosContables.tipo, "ingreso"));

      const [payments, stationerySales, movements] = await Promise.all([
        paymentsQuery,
        stationerySalesQuery,
        movementsQuery,
      ]);

      // Normalize and Merge
      const allIncomes: IncomeRecord[] = [
        ...normalizePayments(payments as PaymentRow[]),
        ...normalizeStationerySales(stationerySales as StationerySaleRow[]),
        ...normalizeMovements(movements as MovementRow[]),
      ];

      const filteredIncomes = allIncomes.filter((income) =>
        matchesIncomeFilters(income, {
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

      filteredIncomes.sort((left, right) => {
        if (sortBy === "amount") {
          return sortOrder === "asc" ? left.monto - right.monto : right.monto - left.monto;
        }

        const dateComparison = left.fecha.localeCompare(right.fecha);
        return sortOrder === "asc" ? dateComparison : -dateComparison;
      });

      const totalAmount = filteredIncomes.reduce((accumulator, current) => accumulator + current.monto, 0);
      const count = filteredIncomes.length;
      const average = count > 0 ? totalAmount / count : 0;

      const filterOptions = buildFilterOptions(allIncomes);
      const dailyStats = buildDailyStats(filteredIncomes);
      const categoryStats = buildCategoryStats(filteredIncomes);
      const methodStats = buildMethodStats(filteredIncomes);

      return NextResponse.json({
        success: true,
        data: filteredIncomes,
        dailyStats,
        categoryStats,
        methodStats,
        filterOptions,
        summary: {
          total: Number(totalAmount.toFixed(2)),
          count,
          average: Number(average.toFixed(2)),
          range: {
            startDate,
            endDate,
          },
        },
      });
    } catch (error: unknown) {
      console.error("Error fetching incomes:", error);
      return CommonErrors.internalError("Error al obtener ingresos");
    }
  },
  { requiredPermission: "ingresos:leer" },
);
