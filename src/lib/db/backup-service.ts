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

    if (!fs.existsSync(this.getBackupPath())) {
      fs.mkdirSync(this.getBackupPath(), { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const args = [process.env.DATABASE_URL!, "-f", filePath];
      const child = spawn(pgDumpPath, args, { shell: false });

      let errorOutput = "";

      child.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          invalidateBackupsCache();
          resolve({ success: true, fileName, filePath });
        } else {
          console.error("Backup failed:", errorOutput);
          reject(new Error(`pg_dump failed with code ${code}: ${errorOutput}`));
        }
      });

      child.on("error", (err) => {
        reject(new Error(`Spawn error: ${err.message}`));
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

    if (!fs.existsSync(filePath)) throw new Error("Backup file not found");

    return new Promise((resolve, reject) => {
      const args = [process.env.DATABASE_URL!, "-f", filePath];
      const child = spawn(psqlPath, args, { shell: false });

      let errorOutput = "";

      child.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          invalidateBackupsCache();
          resolve({ success: true });
        } else {
          console.error("Restore failed:", errorOutput);
          reject(new Error(`psql restore failed with code ${code}: ${errorOutput}`));
        }
      });

      child.on("error", (err) => {
        reject(new Error(`Spawn error: ${err.message}`));
      });
    });
  },
};
