import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as relations from "./relations";
import * as schema from "./schema";

// --- Database Pool (Neon Cloud) ---
// We use DATABASE_URL if available, otherwise CLOUD_DATABASE_URL.
// We remove channel_binding=require as it can sometimes cause issues with the node-postgres driver.
const connectionString = (process.env.DATABASE_URL || process.env.CLOUD_DATABASE_URL || "")
  .replace("&channel_binding=require", "");

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  ssl: {
    rejectUnauthorized: false
  },
});

pool.on("error", (err) => console.error("Database Pool Error (Neon):", err));

/**
 * Database Client
 * Pointing exclusively to Neon Cloud as requested.
 * Local hosting/syncing has been disabled.
 */
export const db = drizzle(pool, { schema: { ...schema, ...relations } });

// Export cloudDb alias for backward compatibility if needed by scripts
export const cloudDb = db;

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log("Closing database connection...");
  await pool.end();
  console.log("Database connection closed.");
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

