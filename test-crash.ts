
import { db } from "./src/lib/db";
import { suscripciones, clientes, banks, cuentasBancarias, cuentasContables, movimientosContables } from "./src/lib/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";

async function testQueries() {
  console.log("Testing Net Income query...");
  try {
    const resultNetIncome = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${suscripciones.precioMensual} AS DECIMAL)), 0)`,
      })
      .from(suscripciones)
      .innerJoin(clientes, eq(suscripciones.clienteId, clientes.id))
      .where(
        and(
          sql`LOWER(${clientes.estado}) = 'activo'`,
          sql`LOWER(${suscripciones.estado}) = 'activo'`,
        )
      );
    console.log("Net Income result:", resultNetIncome);
  } catch (err) {
    console.error("Net Income query failed:", err);
  }

  console.log("Testing Bank Stats query...");
  try {
    const activeAccounts = await db
      .select({
        id: cuentasBancarias.id,
        cuentaContableId: cuentasBancarias.cuentaContableId,
      })
      .from(cuentasBancarias)
      .where(eq(cuentasBancarias.activo, true));
    console.log("Active accounts count:", activeAccounts.length);
  } catch (err) {
    console.error("Bank Stats query failed:", err);
  }
}

testQueries().then(() => {
  console.log("Test finished.");
  process.exit(0);
}).catch(err => {
  console.error("Test crashed:", err);
  process.exit(1);
});
