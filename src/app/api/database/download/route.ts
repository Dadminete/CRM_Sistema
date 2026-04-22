import { NextResponse } from "next/server";
import { backupService } from "@/lib/db/backup-service";
import { withAuth } from "@/lib/api-auth";
import path from "path";
import fs from "fs";

export const GET = withAuth(
  async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("fileName");

    if (!fileName) {
      return NextResponse.json({ error: "Missing fileName" }, { status: 400 });
    }

    const filePath = path.join(backupService.getBackupPath(), fileName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new Response(fileBuffer, {
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "application/sql",
      },
    });
  },
  { requiredPermission: "database:view" },
);
