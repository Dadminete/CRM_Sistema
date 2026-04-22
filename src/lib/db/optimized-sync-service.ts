import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, sql } from "drizzle-orm";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

import * as relations from "./relations";
import * as schema from "./schema";

const execPromise = promisify(exec);

// --- Sync Status Management ---
export async function markTableForSync(tableName: string) {
  try {
    const localPool = new Pool({
      host: "127.0.0.1",
      port: 5432,
      user: "postgres",
      password: "Axm0227*",
      database: "sistema_v3",
      ssl: false,
    });
    const localDb = drizzle(localPool, { schema });
    
    // Check if table exists in our 'sync_queue' (reusing for table names)
    // Or we use a simpler one-liner via psql to avoid Pool overhead here if called frequently
    // But for simplicity, we use localDb
    await localDb.insert(schema.syncQueue).values({
      tabla: tableName,
      operacion: 'MARK_NEEDS_SYNC',
      payload: {},
    }).execute();
    
    await localPool.end();
  } catch (e) {
    console.error("Error marking table for sync:", e);
  }
}

export class OptimizedSyncService {
  private pgBinPath: string;

  constructor() {
    this.pgBinPath = process.env.POSTGRES_BIN_PATH || "C:\\Program Files\\PostgreSQL\\18\\bin";
  }

  async syncAlteredTables(onLog: (msg: string) => void): Promise<{ success: boolean; message: string }> {
    const localPool = new Pool({ host: "127.0.0.1", port: 5432, user: "postgres", password: "Axm0227*", database: "sistema_v3", ssl: false });
    const localDb = drizzle(localPool, { schema });

    try {
      // 1. Find mismatched tables from sync_queue
      onLog("[SISTEMA] Buscando tablas con cambios pendientes...");
      const pending = await localDb.selectDistinct({ tabla: schema.syncQueue.tabla }).from(schema.syncQueue);
      const tablesToSync = pending.map(p => p.tabla).filter(t => t !== "unknown");

      if (tablesToSync.length === 0) {
        onLog("[SISTEMA] No hay tablas marcadas con cambios. Comprobando bitacora por seguridad.");
        tablesToSync.push("bitacora"); // Manual check for now
      }

      onLog(`[SISTEMA] Tablas por sincronizar: ${tablesToSync.join(", ")}`);

      for (const table of tablesToSync) {
        onLog(`[SISTEMA] Iniciando sincronización de tabla: ${table}...`);
        await this.syncSingleTable(table, onLog);
      }

      // 2. Clear queue
      await localDb.delete(schema.syncQueue).execute();
      onLog("[SUCCESS] Todas las tablas han sido sincronizadas.");

      return { success: true, message: "Sincronización diferencial completada." };
    } catch (error: any) {
      onLog(`[ERROR] ${error.message}`);
      return { success: false, message: error.message };
    } finally {
      await localPool.end();
    }
  }

  private async syncSingleTable(tableName: string, onLog: (msg: string) => void): Promise<void> {
    const backupDir = process.env.BACKUP_PATH || "C:\\Back_Sistema\\Backups";
    const tempFile = path.join(backupDir, `sync_table_${tableName}_${Date.now()}.sql`);
    const pgDumpPath = path.join(this.pgBinPath, "pg_dump.exe");
    const psqlPath = path.join(this.pgBinPath, "psql.exe");
    const cloudUrl = process.env.CLOUD_DATABASE_URL || "";
    const env = { ...process.env, PGPASSWORD: "Axm0227*" };

    // Dump ONLY the specific table using COPY format (default) for performance
    const dumpArgs = [
      "--clean", "--if-exists",
      "--no-owner", "--no-privileges", 
      "-h", "127.0.0.1", "-p", "5432", "-U", "postgres", 
      "-t", tableName, "sistema_v3", "-f", tempFile
    ];

    await new Promise<void>((resolve, reject) => {
      const dump = spawn(pgDumpPath, dumpArgs, { env, shell: false });
      
      dump.stderr.on("data", (data) => onLog(`[DUMP-ERROR] ${data.toString()}`));
      dump.on("close", (code) => code === 0 ? resolve() : reject(new Error(`pg_dump failed for ${tableName}`)));
    });

    onLog(`[DUMP] Tabla ${tableName} extraída satisfactoriamente. Preparando restauración...`);

    // Restore ONLY that table to Cloud using psql (faster with COPY format)
    onLog(`[CLOUD] Iniciando transferencia de datos a Neon...`);
    const restoreArgs = [cloudUrl, "-f", tempFile];
    await new Promise<void>((resolve, reject) => {
      const restore = spawn(psqlPath, restoreArgs, { env, shell: false });
      
      restore.stderr.on("data", (data) => onLog(`[CLOUD-ERROR] ${data.toString()}`));
      restore.on("close", (code) => code === 0 ? resolve() : reject(new Error(`psql failed for ${tableName}`)));
    });

    onLog(`[CLOUD] Tabla ${tableName} actualizada en Neon.`);
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  }
}

export const optimizedSyncService = new OptimizedSyncService();
