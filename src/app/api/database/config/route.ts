import { NextResponse } from "next/server";
import { backupService } from "@/lib/db/backup-service";
import { withAuth } from "@/lib/api-auth";
import { localDb, cloudDb } from "@/lib/db";
import { sql } from "drizzle-orm";

export const GET = withAuth(
  async () => {
    let localStatus = "offline";
    let cloudStatus = "offline";

    // 1. Check Local Status
    try {
      await Promise.race([
        localDb.execute(sql`SELECT 1`),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000)),
      ]);
      localStatus = "online";
    } catch (e) {
      localStatus = "offline";
    }

    // 2. Check Cloud Status
    try {
      await Promise.race([
        cloudDb.execute(sql`SELECT 1`),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000)),
      ]);
      cloudStatus = "online";
    } catch (e) {
      cloudStatus = "offline";
    }

    // 3. Check Sync Queue Count
    let pendingSyncCount = 0;
    try {
      const res = await localDb.execute(sql`SELECT COUNT(*) as count FROM sync_queue`);
      pendingSyncCount = Number(res[0].count);
    } catch (e) {
      console.error("Error fetching sync queue count:", e);
    }

    return NextResponse.json({
      backupPath: backupService.getBackupPath(),
      localStatus,
      cloudStatus,
      localUrl: "127.0.0.1:5432 (Local)",
      cloudUrl: process.env.CLOUD_DATABASE_URL?.split("@")[1]?.split("?")[0] || "Neon Cloud",
      pendingSyncCount,
    });
  },
  { requiredPermission: "database:view" }
);
