import { localDb, cloudDb } from "./src/lib/db";
import * as schema from "./src/lib/db/schema";
import { sql, count } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function checkSyncStatus() {
  console.log("=== Comparación Detallada: Local vs Neon (Nube) ===");
  
  const tables = [
    { name: "usuarios", schema: schema.usuarios },
    { name: "clientes", schema: schema.clientes },
    { name: "facturas_clientes", schema: schema.facturasClientes },
    { name: "pagos_clientes", schema: schema.pagosClientes },
    { name: "asientos_contables", schema: schema.asientosContables },
    { name: "productos_papeleria", schema: schema.productosPapeleria },
  ];

  for (const table of tables) {
    try {
      const localRes = await localDb.select({ value: count() }).from(table.schema);
      // For Cloud, we might need to ensure search_path if the role setting doesn't persist through pooler
      const cloudRes = await cloudDb.select({ value: count() }).from(table.schema);

      const localCount = localRes[0].value;
      const cloudCount = cloudRes[0].value;

      const icon = localCount === cloudCount ? "✅" : "❌";
      console.log(`${icon} Tabla: ${table.name.padEnd(25)} | Local: ${String(localCount).padStart(5)} | Nube: ${String(cloudCount).padStart(5)}`);
      
    } catch (e: any) {
      console.error(`❌ Error en tabla ${table.name}: ${e.message || e}`);
    }
  }
  process.exit(0);
}

checkSyncStatus();
