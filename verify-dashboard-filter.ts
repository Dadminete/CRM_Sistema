import "dotenv/config";
import { db } from "./src/lib/db";
import { movimientosContables } from "./src/lib/db/schema";
import { sql, and, startOfDay } from "drizzle-orm";

async function verifyFilter() {
  const today = new Date();
  today.setHours(0,0,0,0);
  const todayIso = today.toISOString();

  console.log(`Checking movements for today: ${todayIso}\n`);

  // Total without filter
  const totalNoFilter = await db
    .select({
      ingresos: sql<string>`SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END)`,
      gastos: sql<string>`SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END)`,
      count: sql<number>`COUNT(*)`
    })
    .from(movimientosContables)
    .where(sql`fecha >= ${todayIso}`);

  console.log("Without filter (Incomes + Bank + Cash):");
  console.log(`  Ingresos: ${totalNoFilter[0]?.ingresos || 0}`);
  console.log(`  Gastos: ${totalNoFilter[0]?.gastos || 0}`);
  console.log(`  Total movements: ${totalNoFilter[0]?.count || 0}\n`);

  // Total with filter (ONLY Cash Boxes)
  const totalWithFilter = await db
    .select({
      ingresos: sql<string>`SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END)`,
      gastos: sql<string>`SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END)`,
      count: sql<number>`COUNT(*)`
    })
    .from(movimientosContables)
    .where(and(
      sql`fecha >= ${todayIso}`,
      sql`caja_id IS NOT NULL`
    ));

  console.log("With filter (Only Cash Boxes):");
  console.log(`  Ingresos: ${totalWithFilter[0]?.ingresos || 0}`);
  console.log(`  Gastos: ${totalWithFilter[0]?.gastos || 0}`);
  console.log(`  Total movements: ${totalWithFilter[0]?.count || 0}\n`);

  // Show the difference (Bank movements today)
  const bankMovements = await db
    .select({
      id: movimientosContables.id,
      descripcion: movimientosContables.descripcion,
      monto: movimientosContables.monto,
      tipo: movimientosContables.tipo,
      bankId: movimientosContables.bankId,
      cuentaBancariaId: movimientosContables.cuentaBancariaId
    })
    .from(movimientosContables)
    .where(and(
      sql`fecha >= ${todayIso}`,
      sql`caja_id IS NULL`
    ));

  if (bankMovements.length > 0) {
    console.log("Bank movements found today (to be excluded):");
    console.table(bankMovements);
  } else {
    console.log("No bank movements found today. The filter will work as soon as a bank transaction occurs.");
  }

  process.exit(0);
}

verifyFilter();
