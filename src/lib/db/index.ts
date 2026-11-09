import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as relations from "./relations";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be configured");
}

const pool = new Pool({ connectionString, max: 1 });

export const db = drizzle(pool, { schema: { ...schema, ...relations } });

export const cloudDb = db;
