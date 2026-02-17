import { NextResponse } from "next/server";
import { backupService } from "@/lib/db/backup-service";

export async function GET() {
  return NextResponse.json({
    backupPath: backupService.getBackupPath(),
    postgresBin: backupService.getPostgresBin(),
    databaseUrl: process.env.DATABASE_URL?.split("@")[1] || "Neon DB", // Masked
  });
}
