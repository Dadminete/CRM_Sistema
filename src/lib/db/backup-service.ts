import { spawn } from "child_process";
import fs from "fs";
import path from "path";

type BackupInfo = {
  name: string;
  size: number;
  createdAt: Date;
};

let backupsCache: { value: BackupInfo[]; expiresAt: number } | null = null;
const BACKUPS_CACHE_TTL_MS = 5_000;
const invalidateBackupsCache = () => {
  backupsCache = null;
};

export const backupService = {
  getBackupPath: () => process.env.BACKUP_PATH || path.join(process.cwd(), "backups"),
  getPostgresBin: () => process.env.POSTGRES_BIN_PATH || "",

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `backup-${timestamp}.sql`;
    const filePath = path.join(this.getBackupPath(), fileName);
    const pgDumpPath = this.getPostgresBin() ? path.join(this.getPostgresBin(), "pg_dump.exe") : "pg_dump";
    const dbUrl = process.env.BACKUP_DATABASE_URL || process.env.DATABASE_URL;

    console.log("Backup path:", this.getBackupPath());
    console.log("pg_dump path:", pgDumpPath);
    console.log("File path:", filePath);
    console.log("Using DATABASE_URL for backup:", !!dbUrl);

    if (this.getPostgresBin() && !fs.existsSync(pgDumpPath)) {
      console.error("pg_dump not found at:", pgDumpPath);
      return Promise.reject(new Error(`pg_dump no se encontró en la ruta especificada: ${pgDumpPath}`));
    }

    if (!fs.existsSync(this.getBackupPath())) {
      fs.mkdirSync(this.getBackupPath(), { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const args = ["--no-owner", "--no-privileges", dbUrl!, "-f", filePath];
      console.log("Running command:", pgDumpPath, args.join(" "));

      // Use shell: false (default) to avoid quoting issues on Windows
      const child = spawn(pgDumpPath, args, { shell: false });

      let errorOutput = "";

      child.stderr.on("data", (data) => {
        errorOutput += data.toString();
        console.log("pg_dump stderr:", data.toString());
      });

      child.stdout.on("data", (data) => {
        console.log("pg_dump stdout:", data.toString());
      });

      child.on("close", (code) => {
        console.log("pg_dump exit code:", code);
        if (code === 0) {
          invalidateBackupsCache();
          resolve({ success: true, fileName, filePath });
        } else {
          console.error("Backup failed:", errorOutput);
          reject(new Error(`pg_dump falló con código ${code}: ${errorOutput}`));
        }
      });

      child.on("error", (err) => {
        console.error("Spawn error:", err);
        reject(new Error(`Error al iniciar pg_dump: ${err.message}`));
      });
    });
  },

  async listBackups() {
    if (backupsCache && Date.now() < backupsCache.expiresAt) {
      return backupsCache.value;
    }

    const directory = this.getBackupPath();
    if (!fs.existsSync(directory)) return [];

    try {
      const files = await fs.promises.readdir(directory);
      const backupFiles = files.filter((fileName) => fileName.endsWith(".sql"));
      const backups = await Promise.all(
        backupFiles.map(async (fileName) => {
          const stats = await fs.promises.stat(path.join(directory, fileName));
          return {
            name: fileName,
            size: stats.size,
            createdAt: stats.birthtime,
          };
        }),
      );

      const sorted = backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      backupsCache = { value: sorted, expiresAt: Date.now() + BACKUPS_CACHE_TTL_MS };
      return sorted;
    } catch (error) {
      console.error("Error listing backups:", error);
      return [];
    }
  },

  async deleteBackup(fileName: string) {
    const filePath = path.join(this.getBackupPath(), fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      invalidateBackupsCache();
      return true;
    }
    return false;
  },

  async restoreBackup(fileName: string) {
    const filePath = path.join(this.getBackupPath(), fileName);
    const psqlPath = this.getPostgresBin() ? path.join(this.getPostgresBin(), "psql.exe") : "psql";

    if (!fs.existsSync(filePath)) throw new Error("Archivo de respaldo no encontrado");

    if (this.getPostgresBin() && !fs.existsSync(psqlPath)) {
      console.error("psql not found at:", psqlPath);
      throw new Error(`psql no se encontró en la ruta especificada: ${psqlPath}`);
    }

    return new Promise((resolve, reject) => {
      const args = [process.env.DATABASE_URL!, "-f", filePath];
      console.log("Running restore command:", psqlPath, args.join(" "));

      const child = spawn(psqlPath, args, { shell: false });

      let errorOutput = "";

      child.stderr.on("data", (data) => {
        errorOutput += data.toString();
        console.log("psql stderr:", data.toString());
      });

      child.on("close", (code) => {
        console.log("psql exit code:", code);
        if (code === 0) {
          invalidateBackupsCache();
          resolve({ success: true });
        } else {
          console.error("Restore failed:", errorOutput);
          reject(new Error(`psql falló con código ${code}: ${errorOutput}`));
        }
      });

      child.on("error", (err) => {
        console.error("Spawn error:", err);
        reject(new Error(`Error al iniciar psql: ${err.message}`));
      });
    });
  },
};
