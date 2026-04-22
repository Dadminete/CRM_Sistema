import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as relations from "./relations";
import * as schema from "./schema";

// --- Local Database Pool ---
const localPool = new Pool({
  host: "127.0.0.1",
  port: 5432,
  user: "postgres",
  password: "Axm0227*",
  database: "sistema_v3",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: false,
});

// --- Cloud Database Pool (Neon) ---
const cloudPool = new Pool({
  connectionString: (process.env.CLOUD_DATABASE_URL || "").replace("&channel_binding=require", ""),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  ssl: {
    rejectUnauthorized: false
  },
});

localPool.on("error", (err) => console.error("Local DB Pool Error:", err));
cloudPool.on("error", (err) => console.error("Cloud DB Pool Error (Neon):", err));

export const localDb = drizzle(localPool, { schema: { ...schema, ...relations } });
export const cloudDb = drizzle(cloudPool, { schema: { ...schema, ...relations } });

/**
 * Hybrid DB Client
 * - Queries (select) run only on Local for speed and offline support.
 * - Mutations (insert, update, delete) run on BOTH.
 * - Errors on Cloud are caught and logged, but don't stop the local operation.
 */
/**
 * Helper to wrap a Drizzle instance (db or tx) with dual-write logic.
 */
function createHybridProxy(targetDb: any, secondaryDb: any): any {
  return new Proxy(targetDb, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);

      // Handle transactions recursively
      if (prop === "transaction") {
        return async (callback: (tx: any) => Promise<any>, config?: any) => {
          return await target.transaction(async (localTx: any) => {
            const proxiedTx = createHybridProxy(localTx, secondaryDb);

            if (secondaryDb) {
              secondaryDb.transaction(async (cloudTx: any) => {
                return await callback(createHybridProxy(cloudTx, null));
              }).catch((err: any) => {
                console.error("[Cloud Sync Error] Transaction sync failed:", err.message);
              });
            }

            return await callback(proxiedTx);
          }, config);
        };
      }

      // Intercept mutations: insert, update, delete
      if (prop === "insert" || prop === "update" || prop === "delete") {
        return (...args: any[]) => {
          const localQueryBuilder = (val as Function).apply(target, args);
          
          let cloudQueryBuilder: any = null;
          if (secondaryDb && secondaryDb[prop]) {
            cloudQueryBuilder = secondaryDb[prop](...args);
          }

          return new Proxy(localQueryBuilder, {
            get(qTarget, qProp, qReceiver) {
              const qVal = Reflect.get(qTarget, qProp, qReceiver);

              if (qProp === "execute" || qProp === "then" || qProp === "catch") {
                return (...qArgs: any[]) => {
                  const localPromise = typeof qVal === 'function' ? qVal.apply(qTarget, qArgs) : qVal;

                  if (cloudQueryBuilder) {
                    const cloudMethod = qProp === 'execute' ? cloudQueryBuilder.execute : cloudQueryBuilder.then;
                    if (typeof cloudMethod === 'function') {
                      cloudMethod.apply(cloudQueryBuilder)
                        .catch(async (err: any) => {
                          console.error(`[Cloud Sync Error] Mutations failed for ${String(prop)}:`, err.message);
                          try {
                            const tableName = (localQueryBuilder as any)?.config?.table?.name || "unknown";
                            const payload = (args[0]) || {};
                            await localDb.insert(schema.syncQueue).values({
                              tabla: tableName,
                              operacion: String(prop).toUpperCase(),
                              payload: payload,
                            }).execute();
                            console.log(`[Sync Queue] Operación encolada para tabla: ${tableName}`);
                          } catch (queueErr: any) {
                            console.error("[Sync Queue Error] No se pudo encolar la operación:", queueErr.message);
                          }
                        });
                    }
                  }

                  return localPromise;
                };
              }

              // Bind other query builder methods (like .where, .returning)
              return typeof qVal === "function" ? qVal.bind(qTarget) : qVal;
            },
          });
        };
      }

      // Important: Bind other methods (like select, execute) to the target
      // so Drizzle's internal 'this' usage doesn't point to the proxy
      return typeof val === "function" ? val.bind(target) : val;
    },
  });
}

export const db = createHybridProxy(localDb, cloudDb) as typeof localDb;

// Export instances if needed for specific use cases
export { localDb, cloudDb };

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log("Closing database connections...");
  await Promise.all([localPool.end(), cloudPool.end()]);
  console.log("Database connections closed.");
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
