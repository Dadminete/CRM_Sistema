/**
 * Script para crear la tabla de notificaciones si no existe
 */

import { db } from "../src/lib/db/index";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function createNotificationsTable() {
  try {
    console.log("🔧 Verificando tabla de notificaciones...");

    // Leer el archivo SQL de migración
    const migrationPath = path.join(process.cwd(), "migrations", "create_notificaciones_table.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    // Ejecutar la migración
    console.log("📝 Ejecutando migración...");
    await db.execute(sql.raw(migrationSQL));

    console.log("✅ Tabla de notificaciones creada exitosamente");
    
    // Verificar que la tabla existe
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notificaciones'
      ) as exists
    `);

    console.log("✅ Verificación:", result.rows[0]);
    process.exit(0);
  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      console.log("✅ La tabla de notificaciones ya existe");
      process.exit(0);
    }
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createNotificationsTable();
