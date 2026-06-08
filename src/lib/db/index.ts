import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as relations from "./relations";
import * as schema from "./schema";

// In Node.js < 22 (Vercel's default runtime) there is no native WebSocket.
// Use the `ws` package so @neondatabase/serverless can open WebSocket connections.
if (typeof WebSocket === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  neonConfig.webSocketConstructor = require("ws");
}

// We use DATABASE_URL if available, otherwise CLOUD_DATABASE_URL.
// We strip channel_binding=require as it can cause issues with some drivers.
const baseConnectionString = (process.env.DATABASE_URL ?? process.env.CLOUD_DATABASE_URL ?? "").replace(
  "&channel_binding=require",
  "",
);

const connectionString = baseConnectionString;

const pool = new Pool({ connectionString });

pool.on("connect", (client) => {
  // Safety net for pooled sessions that ignore DB-level defaults.
  void client.query("SET search_path TO public, neon_auth");
});

const originalQuery = pool.query.bind(pool);
pool.query = (async (...args) => {
  await originalQuery("SET search_path TO public, neon_auth");
  return originalQuery(...args);
}) as typeof pool.query;

const originalConnect = pool.connect.bind(pool);
pool.connect = ((...args: unknown[]) => {
  const firstArg = args[0];

  if (typeof firstArg === "function") {
    const callback = firstArg as (error: unknown, client?: unknown, done?: unknown) => void;

    return originalConnect((error, client, done) => {
      if (error || !client) {
        callback(error, client, done);
        return;
      }

      void client
        .query("SET search_path TO public, neon_auth")
        .then(() => callback(null, client, done))
        .catch((setError: unknown) => callback(setError, client, done));
    });
  }

  return originalConnect().then((client) => {
    if (!client) return client;
    return client.query("SET search_path TO public, neon_auth").then(() => client);
  });
}) as typeof pool.connect;

/**
 * Database Client — Neon serverless driver.
 * Supports transactions and works correctly in Vercel serverless functions.
 */
export const db = drizzle(pool, { schema: { ...schema, ...relations } });

// Export cloudDb alias for backward compatibility
export const cloudDb = db;
