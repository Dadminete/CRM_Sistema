import { NextResponse } from "next/server";

import { sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { cloudDb } from "@/lib/db";
import { backupService } from "@/lib/db/backup-service";

export const GET = withAuth(
  async () => {
    // The application uses a single PostgreSQL database.
    const localStatus = "N/A";
    let cloudStatus = "offline";

    // Check database connectivity.
    try {
      await Promise.race([
        cloudDb.execute(sql`SELECT 1`),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000)),
      ]);
      cloudStatus = "online";
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      cloudStatus = "offline";
    }

    return NextResponse.json({
      backupPath: backupService.getBackupPath(),
      backupMode: "local",
      localStatus,
      cloudStatus,
      localUrl: "N/A (Deshabilitado)",
      cloudUrl: getDatabaseHost(),
      pendingSyncCount: 0,
    });
  },
  { requiredPermission: "database:view" },
);

function getDatabaseHost() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return "PostgreSQL";

  try {
    const url = new URL(connectionString);
    return `${url.hostname}${url.port ? `:${url.port}` : ""}`;
  } catch {
    return "PostgreSQL";
  }
}
