import { NextResponse } from "next/server";
import { syncService } from "@/lib/db/sync-service";
import { withAuth } from "@/lib/api-auth";

export const POST = withAuth(
  async () => {
    try {
      const result = await syncService.pushLocalToCloud();
      if (result.success) {
        return NextResponse.json({ success: true, message: result.message });
      } else {
        return NextResponse.json({ success: false, error: result.error }, { status: 500 });
      }
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  },
  { requiredPermission: "database:manage" }
);
