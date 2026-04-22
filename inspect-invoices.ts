import "dotenv/config";
import { db } from "./src/lib/db";
import { facturasClientes } from "./src/lib/db/schema";

async function inspectTable() {
  const result = await db.select().from(facturasClientes).limit(1);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

inspectTable();
