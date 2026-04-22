import { localDb, cloudDb } from "./src/lib/db";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function checkSyncStatus() {
  console.log("=== Comparación Detallada: Local vs Neon (Nube) ===");
  const tables = ["usuarios", "clientes", "facturas_clientes", "pagos_clientes", "asientos_contables", "productos_papeleria"];

  for (const table of tables) {
    try {
      const localRes = await localDb.execute(sql.raw(`SELECT COUNT(*) as count FROM "${table}"`));
      const cloudRes = await cloudDb.execute(sql.raw(`SELECT COUNT(*) as count FROM "${table}"`));

      const localCount = localRes.rows[0].count;
      const cloudCount = cloudRes.rows[0].count;

      const icon = localCount === cloudCount ? "✅" : "❌";
      console.log(`${icon} Tabla: ${table.padEnd(25)} | Local: ${String(localCount).padStart(5)} | Nube: ${String(cloudCount).padStart(5)}`);
      
    } catch (e: any) {
      console.log(`⚠️  Error en tabla ${table}: ${e.message}`);
    }
  }
  process.exit(0);
}

checkSyncStatus();
