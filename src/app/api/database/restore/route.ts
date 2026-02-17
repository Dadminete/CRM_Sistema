import { NextResponse } from "next/server";
import { backupService } from "@/lib/db/backup-service";

export async function POST(req: Request) {
  try {
    const { action, fileName } = await req.json();

    if (action === "restore") {
      await backupService.restoreBackup(fileName);
      return NextResponse.json({ success: true, message: "Restore successful" });
    }

    if (action === "delete") {
      await backupService.deleteBackup(fileName);
      return NextResponse.json({ success: true, message: "Delete successful" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
