import { exec, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execPromise = promisify(exec);

export class SyncService {
  private pgBinPath: string;

  constructor() {
    this.pgBinPath = process.env.POSTGRES_BIN_PATH || "C:\\Program Files\\PostgreSQL\\18\\bin";
  }

  /**
   * Pushes local database state to Neon (Cloud) with real-time logging.
   */
  async pushLocalToCloudStreaming(onLog: (message: string) => void): Promise<{ success: boolean; message: string; error?: string }> {
    const backupDir = process.env.BACKUP_PATH || "C:\\Back_Sistema\\Backups";
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const tempFile = path.join(backupDir, `sync_push_${Date.now()}.sql`);
    const pgDumpPath = path.join(this.pgBinPath, "pg_dump.exe");
    const psqlPath = path.join(this.pgBinPath, "psql.exe");
    const cloudUrl = process.env.CLOUD_DATABASE_URL || "";

    try {
      const env = { ...process.env, PGPASSWORD: "Axm0227*" };

      // 1. DUMP LOCAL
      onLog("[SISTEMA] Iniciando extracción de datos locales...");
      
      const dumpArgs = [
        "--clean", "--if-exists", "--inserts", "--column-inserts", 
        "--no-owner", "--no-privileges", 
        "-h", "127.0.0.1", "-p", "5432", "-U", "postgres", 
        "sistema_v3", "-f", tempFile
      ];

      await new Promise<void>((resolve, reject) => {
        const dump = spawn(`"${pgDumpPath}"`, dumpArgs, { env, shell: true });
        
        dump.stdout.on("data", (data) => onLog(`[DUMP] ${data.toString().trim()}`));
        dump.stderr.on("data", (data) => onLog(`[DUMP-INFO] ${data.toString().trim()}`));
        
        dump.on("close", (code) => {
          if (code === 0) {
            onLog("[SISTEMA] Extracción local completada.");
            resolve();
          } else {
            reject(new Error(`pg_dump falló con código ${code}`));
          }
        });
      });

      // 2. RESTORE TO CLOUD
      onLog("[SISTEMA] Iniciando subida a Neon Cloud (esto puede tardar)...");
      
      const restoreArgs = [cloudUrl, "-f", tempFile];

      await new Promise<void>((resolve, reject) => {
        const restore = spawn(`"${psqlPath}"`, restoreArgs, { env, shell: true });
        
        restore.stdout.on("data", (data) => onLog(`[CLOUD] ${data.toString().trim()}`));
        restore.stderr.on("data", (data) => onLog(`[CLOUD-INFO] ${data.toString().trim()}`));
        
        restore.on("close", (code) => {
          if (code === 0) {
            onLog("[SISTEMA] Sincronización en la nube finalizada con éxito.");
            resolve();
          } else {
            reject(new Error(`psql falló con código ${code}`));
          }
        });
      });

      // Cleanup
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

      return { success: true, message: "Sincronización masiva completada con éxito." };
    } catch (error: any) {
      onLog(`[ERROR] ${error.message}`);
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      return { 
        success: false, 
        message: "Error durante la sincronización.", 
        error: error.message 
      };
    }
  }

  /**
   * Legacy version for simple backward compatibility (no console streaming).
   */
  async pushLocalToCloud(): Promise<{ success: boolean; message: string; error?: string }> {
    return this.pushLocalToCloudStreaming(() => {});
  }
}

export const syncService = new SyncService();
