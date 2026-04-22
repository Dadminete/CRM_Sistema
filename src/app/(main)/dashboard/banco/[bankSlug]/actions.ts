"use server";

import { db } from "@/lib/db";
import { banks, cuentasBancarias, movimientosContables } from "@/lib/db/schema";
import { eq, desc, asc, ilike, or, inArray, and } from "drizzle-orm";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toBankPathSegment } from "@/lib/utils";

export async function getBankData(slug: string) {
  try {
    // 1. Encontrar todos los bancos activos
    const allBanks = await db.query.banks.findMany({
      where: eq(banks.activo, true),
    });

    // 2. Encontrar el banco que corresponde al slug
    const bank = allBanks.find(b => toBankPathSegment(b.nombre) === slug);

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

    let recentTransactions: any[] = [];
    let allTransactions: any[] = [];
    let statsData = [];
    let expenseStats = { groceries: 0, transport: 0, other: 0 };

    // 4. Obtener transacciones
    const transactions = await db.query.movimientosContables.findMany({
      where: movementWhere,
      orderBy: [desc(movimientosContables.fecha)],
      limit: 10, // Aumentar un poco el límite para el resumen
    });

    recentTransactions = transactions.slice(0, 4).map((t) => ({
      id: t.id,
      title: t.descripcion || "Movimiento",
      subtitle: format(new Date(t.fecha), "dd MMM, yyyy", { locale: es }),
      type: (t.tipo || "").toUpperCase() === "INGRESO" ? "credit" : "debit",
      amount: Number(t.monto),
      date: format(new Date(t.fecha), "dd MMM"),
      method: t.metodo,
    }));

    const allMovements = await db.query.movimientosContables.findMany({
      where: movementWhere,
      orderBy: [asc(movimientosContables.fecha)],
    });

    allTransactions = [...allMovements]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .map((t) => ({
        id: t.id,
        title: t.descripcion || "Movimiento",
        subtitle: format(new Date(t.fecha), "dd MMM, yyyy", { locale: es }),
        fullDate: format(new Date(t.fecha), "dd/MM/yyyy HH:mm", { locale: es }),
        rawDate: t.fecha,
        type: (t.tipo || "").toUpperCase() === "INGRESO" ? "credit" : "debit",
        tipo: (t.tipo || "").toUpperCase(),
        amount: Number(t.monto),
        amountText: Number(t.monto).toFixed(2),
        method: t.metodo,
        cuentaBancariaId: t.cuentaBancariaId,
      }));

    // Agregación mensual
    const monthlyStats = allMovements.reduce((acc: any, curr) => {
      const key = format(new Date(curr.fecha), "yyyy-MM");
      const label = format(new Date(curr.fecha), "MMM yy", { locale: es });
      const year = new Date(curr.fecha).getFullYear();
      if (!acc[key]) {
        acc[key] = { key, month: label, year, income: 0, expenses: 0, scheduled: 0 };
      }
      if ((curr.tipo || "").toUpperCase() === "INGRESO") {
        acc[key].income += Number(curr.monto);
      } else {
        acc[key].expenses += Number(curr.monto);
      }
      return acc;
    }, {});

    statsData = (Object.values(monthlyStats) as any[]).sort((a, b) => a.key.localeCompare(b.key));

    const totalExpenses = allMovements
      .filter((m) => (m.tipo || "").toUpperCase() !== "INGRESO")
      .reduce((sum, m) => sum + Number(m.monto), 0);

    expenseStats = {
      groceries: 0,
      transport: 0,
      other: totalExpenses,
    };

    const totalBalance = allTransactions.reduce((sum, t) => {
      return t.type === "credit" ? sum + t.amount : sum - t.amount;
    }, 0);

    const balancePerAccount = bankAccounts.reduce((map, acc) => {
      const accMovements = allTransactions.filter((t) => t.cuentaBancariaId === acc.id);
      const balance = accMovements.reduce((sum, t) => {
        return t.type === "credit" ? sum + t.amount : sum - t.amount;
      }, 0);
      map[acc.id] = balance;
      return map;
    }, {} as Record<string, number>);

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
