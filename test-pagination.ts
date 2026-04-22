import "dotenv/config";
import { db } from "./src/lib/db";
import { movimientosContables, categoriasCuentas } from "./src/lib/db/schema";
import { eq, ne, and, desc, count } from "drizzle-orm";

async function testPagination() {
  const tipo = "gasto";
  const limit = 100;
  const offset = 0;

  const [countResult, data] = await Promise.all([
    db.select({ total: count() })
      .from(movimientosContables)
      .where(eq(movimientosContables.tipo, tipo)),
    db.select({ id: movimientosContables.id, fecha: movimientosContables.fecha, monto: movimientosContables.monto })
      .from(movimientosContables)
      .where(eq(movimientosContables.tipo, tipo))
      .orderBy(desc(movimientosContables.fecha))
      .limit(limit)
      .offset(offset),
  ]);

  const total = countResult[0]?.total ?? 0;
  console.log(`Total gastos in DB: ${total}`);
  console.log(`Records returned with limit=${limit}, offset=${offset}: ${data.length}`);
  console.log(`Has more pages: ${total > offset + data.length}`);

  process.exit(0);
}

testPagination();
