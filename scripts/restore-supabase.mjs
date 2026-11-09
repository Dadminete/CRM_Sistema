import "dotenv/config";

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const PROJECT_HOST = "db.hokmyvmbogqtnpsjidav.supabase.co";
const PROJECT_POOLER_HOST = "aws-0-us-east-1.pooler.supabase.com";
const PROJECT_POOLER_USER = "postgres.hokmyvmbogqtnpsjidav";
const BACKUP_PATH = fileURLToPath(new URL("../cloud_backup_final_v2.sql", import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE_BYTES = 512 * 1024;

function getExecutableSql(statement) {
  return statement
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*--.*(?:\r?\n|$)/gm, " ")
    .trim();
}

async function visitSqlStatements(sql, onStatement) {
  let statement = "";
  let state = "normal";
  let blockDepth = 0;
  let dollarTag = "";
  let escapeString = false;
  let count = 0;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];
    statement += char;

    if (state === "line-comment") {
      if (char === "\n") state = "normal";
      continue;
    }

    if (state === "block-comment") {
      if (char === "/" && next === "*") {
        statement += next;
        blockDepth += 1;
        i += 1;
      } else if (char === "*" && next === "/") {
        statement += next;
        blockDepth -= 1;
        i += 1;
        if (blockDepth === 0) state = "normal";
      }
      continue;
    }

    if (state === "single-quote") {
      if (char === "'" && next === "'") {
        statement += next;
        i += 1;
      } else if (char === "\\" && escapeString) {
        statement += next ?? "";
        i += 1;
      } else if (char === "'") {
        state = "normal";
        escapeString = false;
      }
      continue;
    }

    if (state === "double-quote") {
      if (char === '"' && next === '"') {
        statement += next;
        i += 1;
      } else if (char === '"') {
        state = "normal";
      }
      continue;
    }

    if (state === "dollar-quote") {
      if (sql.startsWith(dollarTag, i)) {
        statement += sql.slice(i + 1, i + dollarTag.length);
        i += dollarTag.length - 1;
        state = "normal";
      }
      continue;
    }

    if (char === "-" && next === "-") {
      statement += next;
      i += 1;
      state = "line-comment";
    } else if (char === "/" && next === "*") {
      statement += next;
      i += 1;
      blockDepth = 1;
      state = "block-comment";
    } else if (char === "'") {
      const previous = statement.at(-2);
      const beforePrevious = statement.at(-3);
      escapeString = /[Ee]/.test(previous ?? "") && !(beforePrevious && /[A-Za-z0-9_$]/.test(beforePrevious));
      state = "single-quote";
    } else if (char === '"') {
      state = "double-quote";
    } else if (char === "$") {
      const tag = sql.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/)?.[0];
      if (tag) {
        statement += tag.slice(1);
        i += tag.length - 1;
        dollarTag = tag;
        state = "dollar-quote";
      }
    } else if (char === ";") {
      const trimmed = statement.trim();
      if (getExecutableSql(trimmed)) {
        await onStatement(trimmed);
        count += 1;
      }
      statement = "";
    }
  }

  if (state !== "normal" && state !== "line-comment") {
    throw new Error(`El respaldo termina dentro de una expresión SQL (${state}).`);
  }

  const trailing = statement.trim();
  if (getExecutableSql(trailing)) {
    await onStatement(trailing);
    count += 1;
  }

  return count;
}

function getTargetConnectionString() {
  const connectionString = process.env.BACKUP_DATABASE_URL;
  if (!connectionString) {
    throw new Error("Configura BACKUP_DATABASE_URL con la conexión directa o el pooler de sesión de Supabase en .env.");
  }

  const target = new URL(connectionString);
  if (!target.password || /YOUR-PASSWORD/i.test(target.password)) {
    throw new Error("Configura la contraseña real de Supabase en BACKUP_DATABASE_URL dentro de .env.");
  }

  const isDirectConnection = target.hostname === PROJECT_HOST && target.username === "postgres";
  const isSessionPooler =
    target.hostname === PROJECT_POOLER_HOST &&
    target.username === PROJECT_POOLER_USER &&
    target.port === "5432";

  if ((!isDirectConnection && !isSessionPooler) || target.pathname !== "/postgres") {
    throw new Error(
      `Restauración cancelada: BACKUP_DATABASE_URL debe usar la conexión directa de ${PROJECT_HOST} ` +
        `o el pooler de sesión ${PROJECT_POOLER_HOST}:5432 del proyecto Supabase indicado.`,
    );
  }

  return connectionString;
}

async function main() {
  if (!fs.existsSync(BACKUP_PATH)) {
    throw new Error(`No se encontró el respaldo: ${BACKUP_PATH}`);
  }

  const dump = fs.readFileSync(BACKUP_PATH, "utf8");
  let statementCount = 0;
  let insertCount = 0;
  let tableCount = 0;
  let skippedNeonAuthStatements = 0;
  let batch = [];
  let batchBytes = 0;
  let client;
  let transactionStarted = false;

  const onStatement = (statement) => {
    statementCount += 1;
    const executableSql = getExecutableSql(statement);
    if (/\bneon_auth\b/i.test(executableSql)) {
      skippedNeonAuthStatements += 1;
      return;
    }
    if (/^INSERT\s+INTO\s+public\./i.test(executableSql)) insertCount += 1;
    if (/^CREATE\s+TABLE\s+public\./i.test(executableSql)) tableCount += 1;
  };

  if (DRY_RUN) {
    const count = await visitSqlStatements(dump, onStatement);
    console.log(
      `Validación local correcta: ${count} sentencias; ${tableCount} tablas public; ${insertCount} INSERT public; ` +
        `${skippedNeonAuthStatements} sentencias de neon_auth omitidas; ` +
        `${Buffer.byteLength(dump)} bytes. No se conectó ni modificó ninguna base de datos.`,
    );
    return;
  }

  const connectionString = getTargetConnectionString();
  const parsedTarget = new URL(connectionString);
  if (parsedTarget.port !== "5432") {
    throw new Error("La restauración requiere el puerto 5432 de la conexión directa o del pooler de sesión Supabase.");
  }

  client = new Client({ connectionString, connectionTimeoutMillis: 15_000 });

  try {
    await client.connect();
    const preflight = await client.query(`
      SELECT
        (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S')) AS public_objects,
        (SELECT count(*)::int FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'public' AND t.typtype IN ('e', 'd')) AS public_custom_types,
        (SELECT count(*)::int FROM pg_namespace WHERE nspname = 'neon_auth') AS neon_auth_schema
    `);
    const state = preflight.rows[0];
    if (state.public_objects !== 0 || state.public_custom_types !== 0 || state.neon_auth_schema !== 0) {
      throw new Error(
        `Restauración cancelada: Supabase no está vacío (objetos public=${state.public_objects}, ` +
          `tipos public=${state.public_custom_types}, esquema neon_auth=${state.neon_auth_schema}).`,
      );
    }

    await client.query("BEGIN");
    transactionStarted = true;
    await visitSqlStatements(dump, async (statement) => {
      statementCount += 1;
      const executableSql = getExecutableSql(statement);
      if (/\bneon_auth\b/i.test(executableSql)) {
        skippedNeonAuthStatements += 1;
        return;
      }
      if (/^INSERT\s+INTO\s+public\./i.test(executableSql)) insertCount += 1;
      if (/^CREATE\s+TABLE\s+public\./i.test(executableSql)) tableCount += 1;
      batch.push(statement);
      batchBytes += Buffer.byteLength(statement, "utf8");

      if (batchBytes >= BATCH_SIZE_BYTES) {
        const sql = batch.join("\n");
        batch = [];
        batchBytes = 0;
        await client.query(sql);
      }
    });

    if (batch.length > 0) {
      await client.query(batch.join("\n"));
      batch = [];
    }
    await client.query("COMMIT");
    transactionStarted = false;
    console.log(
      `Restauración terminada en ${PROJECT_HOST}: ${tableCount} tablas, ${insertCount} INSERT, ` +
        `${statementCount - skippedNeonAuthStatements} sentencias aplicadas; ` +
        `${skippedNeonAuthStatements} sentencias Neon Auth omitidas.`,
    );
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Restauración no completada: ${error.message}`);
  process.exitCode = 1;
});
