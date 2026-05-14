import { createServer } from "http";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const PORT = Number.parseInt(process.env.PORT || "8787", 10);
const OUTPUT_DIR = process.env.BACKUP_OUTPUT_DIR || path.join(process.cwd(), "worker-backups");
const TOKEN = process.env.BACKUP_WEBHOOK_TOKEN || "";
const MAX_BODY_BYTES = 1024 * 1024;

let backupInProgress = false;

function getBinaryName(tool) {
  return process.platform === "win32" ? `${tool}.exe` : tool;
}

function resolvePgDumpPath() {
  if (process.env.PG_DUMP_PATH) return process.env.PG_DUMP_PATH;
  if (process.env.POSTGRES_BIN_PATH) {
    return path.join(process.env.POSTGRES_BIN_PATH, getBinaryName("pg_dump"));
  }
  return getBinaryName("pg_dump");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = "";

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Payload demasiado grande"));
        req.destroy();
        return;
      }
      body += chunk.toString("utf8");
    });

    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("JSON inválido"));
      }
    });

    req.on("error", reject);
  });
}

function isAuthorized(req) {
  if (!TOKEN) return true;
  const authHeader = req.headers.authorization || "";
  return authHeader === `Bearer ${TOKEN}`;
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function runBackup(dbUrl) {
  return new Promise((resolve, reject) => {
    ensureOutputDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `backup-${timestamp}.sql`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    const pgDumpPath = resolvePgDumpPath();

    const args = ["--no-owner", "--no-privileges", dbUrl, "-f", filePath];
    const startedAt = Date.now();

    const child = spawn(pgDumpPath, args, { shell: false });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        const stats = fs.statSync(filePath);
        resolve({
          success: true,
          fileName,
          filePath,
          sizeBytes: stats.size,
          durationMs: Date.now() - startedAt,
        });
      } else {
        reject(new Error(`pg_dump terminó con código ${code}: ${stderr || "sin detalle"}`));
      }
    });

    child.on("error", (error) => {
      reject(new Error(`No se pudo iniciar pg_dump: ${error.message}`));
    });
  });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      return sendJson(res, 200, {
        ok: true,
        service: "backup-webhook-worker",
        backupInProgress,
        outputDir: OUTPUT_DIR,
      });
    }

    if (req.method !== "POST" || req.url !== "/api/backup") {
      return sendJson(res, 404, { error: "Not Found" });
    }

    if (!isAuthorized(req)) {
      return sendJson(res, 401, { error: "No autorizado" });
    }

    if (backupInProgress) {
      return sendJson(res, 409, { error: "Ya hay un backup en progreso" });
    }

    const body = await readJsonBody(req);
    const dbUrl = body.databaseUrl || process.env.BACKUP_DATABASE_URL || process.env.DATABASE_URL;

    if (!dbUrl) {
      return sendJson(res, 400, {
        error: "Falta databaseUrl en payload o BACKUP_DATABASE_URL/DATABASE_URL en variables de entorno",
      });
    }

    backupInProgress = true;
    try {
      const result = await runBackup(dbUrl);
      return sendJson(res, 201, result);
    } finally {
      backupInProgress = false;
    }
  } catch (error) {
    backupInProgress = false;
    const message = error instanceof Error ? error.message : "Error desconocido";
    return sendJson(res, 500, { error: message });
  }
});

server.listen(PORT, () => {
  console.log(`[backup-worker] Escuchando en puerto ${PORT}`);
  console.log(`[backup-worker] Endpoint: POST /api/backup`);
  console.log(`[backup-worker] Health: GET /health`);
});
