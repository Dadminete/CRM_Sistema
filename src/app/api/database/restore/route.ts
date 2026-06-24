import { NextResponse } from "next/server";

import { withAuth } from "@/lib/api-auth";
import { backupService } from "@/lib/db/backup-service";

export const POST = withAuth(
  async (req: Request) => {
    try {
      const { action, fileName, backupId } = await req.json();

      if (action === "restore") {
        await backupService.restoreBackup(fileName);
        return NextResponse.json({ success: true, message: "Restore successful" });
      }

      if (action === "delete") {
        const target = typeof backupId === "string" && backupId.length > 0 ? backupId : fileName;
        await backupService.deleteBackup(target);
        return NextResponse.json({ success: true, message: "Delete successful" });
      }

      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error interno del servidor";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { requiredPermission: "database:restore" },
);
