import { spawn } from "child_process";
import fs from "fs";
import path from "path";

type BackupInfo = {
  id: string;
  name: string;
  size: number;
  createdAt: Date;
  provider: "local" | "neon-snapshot";
  actions: {
    download: boolean;
    restore: boolean;
    delete: boolean;
  };
};

type NeonSnapshot = {
  id: string;
  name?: string;
  created_at?: string;
  full_size?: number;
  diff_size?: number;
};

type NeonSnapshotCreateResponse = {
  snapshot?: NeonSnapshot;
};

type NeonSnapshotListResponse = {
  snapshots?: NeonSnapshot[];
};

let backupsCache: { value: BackupInfo[]; expiresAt: number } | null = null;
const BACKUPS_CACHE_TTL_MS = 5_000;
const invalidateBackupsCache = () => {
  backupsCache = null;
};

const isVercelEnvironment = () => process.env.VERCEL === "1" || Boolean(process.env.VERCEL_URL);
const postgresBinaryName = (tool: "pg_dump" | "psql") => (process.platform === "win32" ? `${tool}.exe` : tool);
const NEON_API_BASE_URL = "https://console.neon.tech/api/v2";

const toIsoDate = (value?: string) => {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const toSnapshotSize = (snapshot: NeonSnapshot) => {
  if (typeof snapshot.full_size === "number") return snapshot.full_size;
  if (typeof snapshot.diff_size === "number") return snapshot.diff_size;
  return 0;
};

const mapSnapshotToBackupInfo = (snapshot: NeonSnapshot): BackupInfo => ({
  id: `snapshot:${snapshot.id}`,
  name: snapshot.name ?? snapshot.id,
  size: toSnapshotSize(snapshot),
  createdAt: toIsoDate(snapshot.created_at),
  provider: "neon-snapshot",
  actions: {
    download: false,
    restore: false,
    delete: true,
  },
});

const getNeonCredentials = () => ({
  apiKey: process.env.NEON_API_KEY,
  projectId: process.env.NEON_PROJECT_ID,
  branchId: process.env.NEON_BRANCH_ID,
});

export const backupService = {
  getBackupPath: () => process.env.BACKUP_PATH ?? path.join(process.cwd(), "backups"),
  getPostgresBin: () => process.env.POSTGRES_BIN_PATH ?? "",
  hasNeonSnapshotSupport() {
    const { apiKey, projectId, branchId } = getNeonCredentials();
    return Boolean(apiKey && projectId && branchId);
  },
  async neonRequest<T>(pathName: string, init?: RequestInit): Promise<T> {
    const { apiKey, projectId } = getNeonCredentials();

    if (!apiKey || !projectId) {
      throw new Error("Faltan variables para Neon API. Configura NEON_API_KEY y NEON_PROJECT_ID en Vercel.");
    }

    const response = await fetch(`${NEON_API_BASE_URL}/projects/${projectId}${pathName}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Neon API respondió ${response.status}: ${details ?? "sin detalle"}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  },
  async createBackupViaNeonSnapshot() {
    const { branchId } = getNeonCredentials();
    if (!branchId) {
      throw new Error("Falta NEON_BRANCH_ID para crear snapshots en Neon desde Vercel.");
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const snapshotName = `dashboard-${timestamp}`;
    const payload = await this.neonRequest<NeonSnapshotCreateResponse>(`/branches/${branchId}/snapshot`, {
      method: "POST",
      body: JSON.stringify({
        name: snapshotName,
      }),
    });

    const snapshot = payload.snapshot;
    if (!snapshot?.id) {
      throw new Error("Neon no devolvió información del snapshot creado.");
    }

    invalidateBackupsCache();
    return {
      success: true,
      delegated: true,
      provider: "neon-snapshot",
      snapshotId: snapshot.id,
      snapshotName: snapshot.name ?? snapshotName,
      createdAt: snapshot.created_at ?? new Date().toISOString(),
    };
  },
  getPostgresExecutable(tool: "pg_dump" | "psql") {
    const binaryName = postgresBinaryName(tool);
    return this.getPostgresBin() ? path.join(this.getPostgresBin(), binaryName) : binaryName;
  },

  async createBackupViaWebhook(webhookUrl: string, dbUrl: string) {
    const token = process.env.BACKUP_WEBHOOK_TOKEN;
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        databaseUrl: dbUrl,
        source: "database-dashboard",
        requestedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`El webhook de backup respondió ${response.status}: ${details ?? "sin detalle"}`);
    }

    const payload = await response.json().catch(() => ({}));
    invalidateBackupsCache();
    return {
      success: true,
      delegated: true,
      provider: "webhook",
      ...payload,
    };
  },

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `backup-${timestamp}.sql`;
    const filePath = path.join(this.getBackupPath(), fileName);
    const pgDumpPath = this.getPostgresExecutable("pg_dump");
    const dbUrl = process.env.BACKUP_DATABASE_URL ?? process.env.DATABASE_URL;
    const webhookUrl = process.env.BACKUP_WEBHOOK_URL;

    if (!dbUrl) {
      throw new Error("No hay URL de base de datos disponible para generar el backup");
    }

    if (webhookUrl) {
      return this.createBackupViaWebhook(webhookUrl, dbUrl);
    }

    if (this.hasNeonSnapshotSupport()) {
      return this.createBackupViaNeonSnapshot();
    }

    if (isVercelEnvironment()) {
      throw new Error(
        "En Vercel no se puede ejecutar pg_dump ni guardar respaldos locales persistentes. Configura BACKUP_WEBHOOK_URL o variables NEON_API_KEY + NEON_PROJECT_ID + NEON_BRANCH_ID para usar snapshots de Neon desde este panel.",
      );
    }

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
      const args = ["--no-owner", "--no-privileges", dbUrl, "-f", filePath];
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
          resolve({
            success: true,
            fileName,
            filePath,
            provider: "local",
          });
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

    if (this.hasNeonSnapshotSupport()) {
      const { branchId } = getNeonCredentials();
      if (!branchId) {
        throw new Error("Falta NEON_BRANCH_ID para listar snapshots de Neon.");
      }

      try {
        const payload = await this.neonRequest<NeonSnapshotListResponse>("/snapshots", {
          method: "GET",
        });
        const snapshots = (payload.snapshots ?? []).filter((snapshot) => snapshot.id && snapshot.id.length > 0);
        const backups = snapshots
          .map((snapshot) => mapSnapshotToBackupInfo(snapshot))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        backupsCache = { value: backups, expiresAt: Date.now() + BACKUPS_CACHE_TTL_MS };
        return backups;
      } catch (error) {
        console.error("Error listing Neon snapshots:", error);
        return [];
      }
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
            id: fileName,
            name: fileName,
            size: stats.size,
            createdAt: stats.birthtime,
            provider: "local",
            actions: {
              download: true,
              restore: true,
              delete: true,
            },
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

  async deleteBackup(fileNameOrId: string) {
    if (fileNameOrId.startsWith("snapshot:")) {
      const snapshotId = fileNameOrId.slice("snapshot:".length);
      if (!snapshotId) {
        throw new Error("Identificador de snapshot inválido.");
      }

      await this.neonRequest(`/snapshots/${snapshotId}`, { method: "DELETE" });
      invalidateBackupsCache();
      return true;
    }

    const filePath = path.join(this.getBackupPath(), fileNameOrId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      invalidateBackupsCache();
      return true;
    }
    return false;
  },

  async restoreBackup(fileName: string) {
    const filePath = path.join(this.getBackupPath(), fileName);
    const psqlPath = this.getPostgresExecutable("psql");

    if (!fs.existsSync(filePath)) throw new Error("Archivo de respaldo no encontrado");

    if (isVercelEnvironment()) {
      throw new Error(
        "La restauración con psql no está disponible en Vercel. Ejecuta la restauración desde un entorno con PostgreSQL client instalado.",
      );
    }

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
