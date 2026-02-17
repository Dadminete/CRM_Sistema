import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";
import * as relations from "./relations";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection can't be established
  // SSL configuration for production
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log("Closing database connections...");
  await pool.end();
  console.log("Database connections closed.");
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

export const db = drizzle(pool, { schema: { ...schema, ...relations } });
