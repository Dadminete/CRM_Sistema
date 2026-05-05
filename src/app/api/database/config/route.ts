import { NextResponse } from "next/server";

import { sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { cloudDb } from "@/lib/db";
import { backupService } from "@/lib/db/backup-service";

export const GET = withAuth(
  async () => {
    // Local DB has been removed; this system uses Neon Cloud exclusively.
    const localStatus = "N/A";
    let cloudStatus = "offline";

    // Check Cloud (Neon) Status
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
      localStatus,
      cloudStatus,
      localUrl: "N/A (Deshabilitado)",
      cloudUrl: process.env.CLOUD_DATABASE_URL?.split("@")[1]?.split("?")[0] ?? "Neon Cloud",
      pendingSyncCount: 0,
    });
  },
  { requiredPermission: "database:view" },
);
