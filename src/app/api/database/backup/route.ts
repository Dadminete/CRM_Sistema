import { NextRequest, NextResponse } from "next/server";
import { backupService } from "@/lib/db/backup-service";
import { withAuth } from "@/lib/api-auth";
import { successResponse, CommonErrors } from "@/lib/api-response";

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const result = await backupService.createBackup();
      return successResponse(result, undefined, 201);
    } catch (error: any) {
      console.error("Error creating backup:", error);
      return CommonErrors.internalError("Error al crear backup de la base de datos");
    }
  },
  { requiredPermission: "database:backup" },
);
