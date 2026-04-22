import { NextResponse } from "next/server";
import { backupService } from "@/lib/db/backup-service";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(
  async () => {
    try {
      const backups = await backupService.listBackups();
      return NextResponse.json(backups);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  },
  { requiredPermission: "database:view" },
);
