import "dotenv/config";
import { db } from "./src/lib/db";
import { cuentasBancarias, movimientosContables, banks } from "./src/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";

async function verifyBalanceFormula() {
  const activeAccounts = await db
    .select({
      id: cuentasBancarias.id,
      nombre: cuentasBancarias.nombreOficialCuenta,
      saldoInicial: cuentasBancarias.saldoInicial,
    })
    .from(cuentasBancarias)
    .where(eq(cuentasBancarias.activo, true));

  console.log(`Found ${activeAccounts.length} active accounts.\n`);

  for (const account of activeAccounts) {
    const ingresos = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)` })
      .from(movimientosContables)
      .where(and(eq(movimientosContables.cuentaBancariaId, account.id), eq(movimientosContables.tipo, 'ingreso')));

    const gastos = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(${movimientosContables.monto} AS DECIMAL)), 0)` })
      .from(movimientosContables)
      .where(and(eq(movimientosContables.cuentaBancariaId, account.id), eq(movimientosContables.tipo, 'gasto')));

    const totalIngresos = Number(ingresos[0]?.total || 0);
    const totalGastos = Number(gastos[0]?.total || 0);
    const initial = Number(account.saldoInicial);
    const calculated = initial + totalIngresos - totalGastos;

    console.log(`Account: ${account.nombre}`);
    console.log(`  Initial: ${initial}`);
    console.log(`  Ingresos: ${totalIngresos}`);
    console.log(`  Gastos: ${totalGastos}`);
    console.log(`  Calculated Balance: ${calculated}\n`);
  }

  process.exit(0);
}

verifyBalanceFormula();
