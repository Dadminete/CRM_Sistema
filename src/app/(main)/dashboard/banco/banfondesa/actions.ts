"use server";

import { db } from "@/lib/db";
import { banks, cuentasBancarias, movimientosContables, cuentasContables } from "@/lib/db/schema";
import { eq, desc, asc, ilike, and, like, sql } from "drizzle-orm";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export async function getBanfondesaData() {
  try {
    // 1. Find Banfondesa Bank
    const bank = await db.query.banks.findFirst({
      where: ilike(banks.nombre, "%Banfondesa%"), // Case insensitive search
      with: {
        cuentasBancarias: {
          with: {
            cuentasContable: true,
          },
        },
      },
    });

    if (!bank) {
      return {
        success: false,
        error:
          "Banco Banfondesa no encontrado. Por favor asegúrese de que el banco esté registrado con el nombre 'Banfondesa'.",
        data: null,
      };
    }

    // 2. Fetch Recent Transactions (Movimientos looking at bank accounts)
    // We need to find movements where cuentaBancariaId is one of the bank's accounts OR bankId is this bank
    // For simplicity, let's fetch movements linked to the bank's accounts.

    const accountIds = bank.cuentasBancarias.map((acc) => acc.id);

    let recentTransactions: any[] = [];
    let statsData = [];
    let expenseStats = { groceries: 0, transport: 0, other: 0 }; // Placeholder categories

    if (accountIds.length > 0) {
      // Fetch recent transactions
      const transactions = await db.query.movimientosContables.findMany({
        where: sql`${movimientosContables.cuentaBancariaId} IN ${accountIds}`,
        orderBy: [desc(movimientosContables.fecha)],
        limit: 5,
        with: {
          categoria: true, // To show category/description
        },
      });

      recentTransactions = transactions.map((t) => ({
        id: t.id,
        title: t.descripcion || "Movimiento",
        subtitle: format(new Date(t.fecha), "dd MMM, yyyy", { locale: es }),
        type: t.tipo === "INGRESO" ? "credit" : "debit",
        amount: Number(t.monto),
        date: format(new Date(t.fecha), "dd MMM"),
        method: t.metodo,
      }));

      // Fetch stats for chart (Last 6 months approx)
      // This is a simplified aggregation. For a real app, we'd use robust date grouping.
      // fetching all movements to aggregate in JS for simplicity or use complex SQL.
      const allMovements = await db.query.movimientosContables.findMany({
        where: sql`${movimientosContables.cuentaBancariaId} IN ${accountIds}`,
        orderBy: [asc(movimientosContables.fecha)],
      });

      // Aggregate for Financial Overview (Monthly)
      const monthlyStats = allMovements.reduce((acc: any, curr) => {
        const month = format(new Date(curr.fecha), "MMM");
        if (!acc[month]) {
          acc[month] = { month, income: 0, expenses: 0, scheduled: 0 };
        }
        if (curr.tipo === "INGRESO") {
          acc[month].income += Number(curr.monto);
        } else {
          acc[month].expenses += Number(curr.monto);
        }
        return acc;
      }, {});

      statsData = Object.values(monthlyStats);

      // Aggregate for Expenses Summary (by simple logic or category if available)
      // Since we don't have "Groceries" etc mapped, we'll just put everything in "Other" or map based on description/category if possible.
      // For now, let's just use dummy distribution or single category for "General"
      const totalExpenses = allMovements
        .filter((m) => m.tipo !== "INGRESO")
        .reduce((sum, m) => sum + Number(m.monto), 0);

      expenseStats = {
        groceries: 0,
        transport: 0,
        other: totalExpenses,
      };
    }

    // Calculate total balance from all accounts
    const totalBalance = bank.cuentasBancarias.reduce((sum, acc) => {
      // Assuming accounts have a calculated balance or we use the linked accounting account balance
      // If Account has 'saldoActual' (it doesn't in schema directly shown for bank account, but CuentaContable does)
      // Let's use the linked CuentaContable saldoActual.
      return sum + (Number(acc.cuentasContable?.saldoActual) || 0);
    }, 0);

    return {
      success: true,
      data: {
        bank,
        totalBalance,
        recentTransactions,
        statsData,
        expenseStats,
      },
    };
  } catch (error) {
    console.error("Error fetching Banfondesa data:", error);
    return { success: false, error: "Error al cargar datos de Banfondesa" };
  }
}
