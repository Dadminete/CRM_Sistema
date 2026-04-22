import { db } from "./src/lib/db/index.ts";
import { clientes, suscripciones } from "./src/lib/db/schema.ts";
import { eq } from "drizzle-orm";

async function run() {
  const clientId = "CLI-2025-0019";
  
  const clientData = await db.select().from(clientes).where(eq(clientes.id, clientId));
  const subData = await db.select().from(suscripciones).where(eq(suscripciones.clienteId, clientId));
  
  console.log("Client Data:", JSON.stringify(clientData, null, 2));
  console.log("Subscription Data:", JSON.stringify(subData, null, 2));
  
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
