import "dotenv/config";
import { db } from "./src/lib/db";
import { cuentasBancarias, cuentasContables, movimientosContables } from "./src/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";

async function verifyBalanceFormula() {
  const activeAccounts = await db
    .select({
      id: cuentasBancarias.id,
      nombre: cuentasBancarias.nombreOficialCuenta,
      cuentaContableId: cuentasBancarias.cuentaContableId,
    })
    .from(cuentasBancarias)
    .where(eq(cuentasBancarias.activo, true));

  console.log(`Found ${activeAccounts.length} active bank accounts.\n`);

  let grandTotal = 0;

  for (const account of activeAccounts) {
    // Get ledger initial balance
    const [ledger] = await db
      .select({ saldoInicial: cuentasContables.saldoInicial })
      .from(cuentasContables)
      .where(eq(cuentasContables.id, account.cuentaContableId))
      .limit(1);

    const initial = Number(ledger?.saldoInicial || 0);

    // Sum movements
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
    const balance = initial + totalIngresos - totalGastos;
    
    grandTotal += balance;

    console.log(`Account: ${account.nombre}`);
    console.log(`  Initial (Ledger): ${initial}`);
    console.log(`  Ingresos: ${totalIngresos}`);
    console.log(`  Gastos: ${totalGastos}`);
    console.log(`  Calculated Balance: ${balance}\n`);
  }

  console.log(`\nGRAND TOTAL: ${grandTotal}`);
  process.exit(0);
}

verifyBalanceFormula();
