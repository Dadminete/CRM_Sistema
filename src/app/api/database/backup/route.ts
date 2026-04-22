import { NextRequest, NextResponse } from "next/server";
import { backupService } from "@/lib/db/backup-service";
import { withAuth } from "@/lib/api-auth";
import { successResponse, CommonErrors } from "@/lib/api-response";

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      console.log("Starting backup attempt...");
      console.log("ENV POSTGRES_BIN_PATH:", process.env.POSTGRES_BIN_PATH);
      console.log("ENV BACKUP_PATH:", process.env.BACKUP_PATH);
      const result = await backupService.createBackup();
      return successResponse(result, undefined, 201);
    } catch (error: any) {
      console.error("DEBUG: Backup error details:", error);
      return CommonErrors.internalError(`Error al crear backup: ${error.message}`);
    }
  },
  { requiredPermission: "database:backup" },
);
