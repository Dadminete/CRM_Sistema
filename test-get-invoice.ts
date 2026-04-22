
import * as dotenv from "dotenv";
dotenv.config();

import { db } from "./src/lib/db";
import { facturasClientes } from "./src/lib/db/schema";
import { desc } from "drizzle-orm";

async function main() {
  const result = await db.select({ id: facturasClientes.id, numeroFactura: facturasClientes.numeroFactura }).from(facturasClientes).limit(5).orderBy(desc(facturasClientes.fechaFactura));
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch(console.error);
