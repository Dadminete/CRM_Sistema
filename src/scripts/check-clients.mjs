import { db } from "../lib/db/index.ts";
import * as schema from "../lib/db/schema.ts";

async function checkClients() {
  try {
    const clientes = schema.clientes;
    if (!clientes) {
      console.log("Available exports:", Object.keys(schema).join(", "));
      throw new Error("clientes table not found in schema");
    }

    const lastClients = await db
      .select({
        id: clientes.id,
        nombre: clientes.nombre,
        fotoUrl: clientes.fotoUrl,
        createdAt: clientes.createdAt
      })
      .from(clientes)
      .orderBy(schema.clientes.createdAt)
      .limit(5);

    console.log("Last 5 clients:", JSON.stringify(lastClients, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkClients();
