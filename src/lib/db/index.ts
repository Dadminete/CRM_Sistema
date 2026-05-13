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
const connectionString = (process.env.DATABASE_URL ?? process.env.CLOUD_DATABASE_URL ?? "").replace(
  "&channel_binding=require",
  "",
);

const pool = new Pool({ connectionString });

/**
 * Database Client — Neon serverless driver.
 * Supports transactions and works correctly in Vercel serverless functions.
 */
export const db = drizzle(pool, { schema: { ...schema, ...relations } });

// Export cloudDb alias for backward compatibility
export const cloudDb = db;
