import "dotenv/config";
import { db } from "./src/lib/db";
import { cuentasContables } from "./src/lib/db/schema";

async function inspectTable() {
  const result = await db.select().from(cuentasContables).limit(1);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

inspectTable();
