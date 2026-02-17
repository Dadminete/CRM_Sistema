import { NextResponse } from "next/server";
import { backupService } from "@/lib/db/backup-service";

export async function GET() {
  try {
    const backups = await backupService.listBackups();
    return NextResponse.json(backups);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
