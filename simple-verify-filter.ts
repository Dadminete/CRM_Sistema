import "dotenv/config";
import { db } from "./src/lib/db";
import { movimientosContables } from "./src/lib/db/schema";
import { sql, and } from "drizzle-orm";

async function verifyFilter() {
  const today = new Date();
  today.setHours(0,0,0,0);
  const todayIso = today.toISOString();

  // Total without filter
  const totalNoFilter = await db
    .select({
      gastos: sql<string>`SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END)`,
    })
    .from(movimientosContables)
    .where(sql`fecha >= ${todayIso}`);

  // Total with filter (ONLY Cash Boxes)
  const totalWithFilter = await db
    .select({
      gastos: sql<string>`SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END)`,
    })
    .from(movimientosContables)
    .where(and(
      sql`fecha >= ${todayIso}`,
      sql`caja_id IS NOT NULL`
    ));

  console.log(`TOTAL_GASTOS_TODAY_NO_FILTER: ${totalNoFilter[0]?.gastos || 0}`);
  console.log(`TOTAL_GASTOS_TODAY_WITH_FILTER: ${totalWithFilter[0]?.gastos || 0}`);
  
  process.exit(0);
}

verifyFilter();
