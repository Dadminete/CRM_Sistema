"use server";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { eq, desc, asc, or, inArray, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { banks, categoriasCuentas, cuentasBancarias, movimientosContables } from "@/lib/db/schema";
import { toBankPathSegment } from "@/lib/utils";

export async function getBankData(slug: string) {
  try {
    // 1. Encontrar todos los bancos activos
    const allBanks = await db.query.banks.findMany({
      where: eq(banks.activo, true),
    });

    // 2. Encontrar el banco que corresponde al slug
    const bank = allBanks.find((b) => toBankPathSegment(b.nombre) === slug);

    if (!bank) {
      return {
        success: false,
        error: `Banco con identificador '${slug}' no encontrado.`,
        data: null,
      };
    }

    // 3. Obtener cuentas bancarias de forma explícita
    const bankAccounts = await db
      .select({
        id: cuentasBancarias.id,
        numeroCuenta: cuentasBancarias.numeroCuenta,
        tipoCuenta: cuentasBancarias.tipoCuenta,
        moneda: cuentasBancarias.moneda,
      })
      .from(cuentasBancarias)
      .where(and(eq(cuentasBancarias.bankId, bank.id), eq(cuentasBancarias.activo, true)));

    const accountIds = bankAccounts.map((acc) => acc.id);
    const movementWhere =
      accountIds.length > 0
        ? or(eq(movimientosContables.bankId, bank.id), inArray(movimientosContables.cuentaBancariaId, accountIds))
        : eq(movimientosContables.bankId, bank.id);

    type RecentTransaction = {
      id: string;
      title: string;
      subtitle: string;
      type: string;
      amount: number;
      date: string;
      method: string | null | undefined;
    };
    type AllTransaction = RecentTransaction & {
      fullDate: string;
      rawDate: string;
      tipo: string;
      amountText: string;
      cuentaBancariaId: string | null | undefined;
    };
    type MonthlyStatEntry = {
      key: string;
      month: string;
      year: number;
      income: number;
      expenses: number;
      scheduled: number;
    };
    let recentTransactions: RecentTransaction[] = [];
    let allTransactions: AllTransaction[] = [];
    let statsData: MonthlyStatEntry[] = [];
    let expenseStats = {
      topCategories: [
        { name: "Sin datos", amount: 0 },
        { name: "Sin datos", amount: 0 },
        { name: "Sin datos", amount: 0 },
      ],
      totalMonthExpenses: 0,
      periodLabel: format(new Date(), "MMMM yyyy", { locale: es }),
    };

    // 4. Obtener transacciones
    const transactions = await db.query.movimientosContables.findMany({
      where: movementWhere,
      orderBy: [desc(movimientosContables.fecha)],
      limit: 10, // Aumentar un poco el límite para el resumen
    });

    recentTransactions = transactions.slice(0, 4).map((t) => ({
      id: t.id,
      title: t.descripcion ?? "Movimiento",
      subtitle: format(new Date(t.fecha), "dd MMM, yyyy", { locale: es }),
      type: (t.tipo ?? "").toUpperCase() === "INGRESO" ? "credit" : "debit",
      amount: Number(t.monto),
      date: format(new Date(t.fecha), "dd MMM"),
      method: t.metodo,
    }));

    const allMovements = await db.query.movimientosContables.findMany({
      where: movementWhere,
      orderBy: [asc(movimientosContables.fecha)],
      with: {
        categoriasCuenta: {
          columns: {
            nombre: true,
          },
        },
      },
    });

    allTransactions = [...allMovements]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .map((t) => ({
        id: t.id,
        title: t.descripcion ?? "Movimiento",
        subtitle: format(new Date(t.fecha), "dd MMM, yyyy", { locale: es }),
        fullDate: format(new Date(t.fecha), "dd/MM/yyyy HH:mm", { locale: es }),
        rawDate: t.fecha,
        type: (t.tipo ?? "").toUpperCase() === "INGRESO" ? "credit" : "debit",
        tipo: (t.tipo ?? "").toUpperCase(),
        amount: Number(t.monto),
        amountText: Number(t.monto).toFixed(2),
        method: t.metodo,
        cuentaBancariaId: t.cuentaBancariaId,
      }));

    // Agregación mensual
    type MonthlyEntry = {
      key: string;
      month: string;
      year: number;
      income: number;
      expenses: number;
      scheduled: number;
    };
    const monthlyStats = allMovements.reduce<Record<string, MonthlyEntry>>((acc, curr) => {
      const key = format(new Date(curr.fecha), "yyyy-MM");
      const label = format(new Date(curr.fecha), "MMM yy", { locale: es });
      const year = new Date(curr.fecha).getFullYear();
      acc[key] ??= { key, month: label, year, income: 0, expenses: 0, scheduled: 0 };
      if ((curr.tipo ?? "").toUpperCase() === "INGRESO") {
        acc[key].income += Number(curr.monto);
      } else {
        acc[key].expenses += Number(curr.monto);
      }
      return acc;
    }, {});

    statsData = Object.values(monthlyStats).sort((a, b) => a.key.localeCompare(b.key));

    const traspasoCategory = await db
      .select({ id: categoriasCuentas.id })
      .from(categoriasCuentas)
      .where(eq(categoriasCuentas.codigo, "TRASP-001"))
      .limit(1);

    const traspasoCategoryId = traspasoCategory[0]?.id;

    const now = new Date();
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);

    const isExpenseInPeriod = (movement: (typeof allMovements)[number], from: Date, to: Date): boolean => {
      if (String(movement.tipo ?? "").toUpperCase() === "INGRESO") return false;
      if (traspasoCategoryId && movement.categoriaId === traspasoCategoryId) return false;
      const movementDate = new Date(movement.fecha);
      return movementDate >= from && movementDate <= to;
    };

    const buildTopCategories = (from: Date, to: Date) => {
      const categoryTotals = new Map<string, number>();
      let totalExpenses = 0;

      for (const movement of allMovements.filter((m) => isExpenseInPeriod(m, from, to))) {
        const amount = Number(movement.monto ?? 0);
        const categoryName = movement.categoriasCuenta?.nombre ?? "Sin categoría";
        totalExpenses += amount;
        categoryTotals.set(categoryName, (categoryTotals.get(categoryName) ?? 0) + amount);
      }

      const topCategories = Array.from(categoryTotals.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

      while (topCategories.length < 3) {
        topCategories.push({ name: "Sin datos", amount: 0 });
      }

      return {
        topCategories,
        totalExpenses,
      };
    };

    const currentMonthStats = buildTopCategories(firstDayOfCurrentMonth, lastDayOfCurrentMonth);
    const lastMonthStats = buildTopCategories(firstDayOfLastMonth, lastDayOfLastMonth);
    const ytdStats = buildTopCategories(firstDayOfYear, lastDayOfCurrentMonth);

    expenseStats = {
      topCategories: currentMonthStats.topCategories,
      totalMonthExpenses: currentMonthStats.totalExpenses,
      periodLabel: format(firstDayOfCurrentMonth, "MMMM yyyy", { locale: es }),
      periods: {
        currentMonth: {
          key: "current-month",
          label: format(firstDayOfCurrentMonth, "MMMM yyyy", { locale: es }),
          topCategories: currentMonthStats.topCategories,
          totalExpenses: currentMonthStats.totalExpenses,
        },
        lastMonth: {
          key: "last-month",
          label: format(firstDayOfLastMonth, "MMMM yyyy", { locale: es }),
          topCategories: lastMonthStats.topCategories,
          totalExpenses: lastMonthStats.totalExpenses,
        },
        ytd: {
          key: "year-to-date",
          label: `enero - ${format(lastDayOfCurrentMonth, "MMMM yyyy", { locale: es })}`,
          topCategories: ytdStats.topCategories,
          totalExpenses: ytdStats.totalExpenses,
        },
      },
    };

    const totalBalance = allTransactions.reduce((sum, t) => {
      return t.type === "credit" ? sum + t.amount : sum - t.amount;
    }, 0);

    const balancePerAccount = bankAccounts.reduce(
      (map, acc) => {
        const accMovements = allTransactions.filter((t) => t.cuentaBancariaId === acc.id);
        const balance = accMovements.reduce((sum, t) => {
          return t.type === "credit" ? sum + t.amount : sum - t.amount;
        }, 0);
        map[acc.id] = balance;
        return map;
      },
      {} as Record<string, number>,
    );

    const bankData = {
      ...bank,
      cuentasBancarias: bankAccounts.map((acc) => ({
        id: acc.id,
        numeroCuenta: acc.numeroCuenta,
        tipoCuenta: acc.tipoCuenta,
        moneda: acc.moneda,
        balance: balancePerAccount[acc.id] ?? 0,
      })),
    };

    return {
      success: true,
      data: {
        bank: bankData,
        totalBalance,
        recentTransactions,
        allTransactions,
        statsData,
        expenseStats,
      },
    };
  } catch (error) {
    console.error(`Error obteniendo datos del banco ${slug}:`, error);
    return { success: false, error: "Error al cargar los datos del banco" };
  }
}
