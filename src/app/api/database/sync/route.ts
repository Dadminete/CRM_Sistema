import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

export const POST = withAuth(
  async () => {
    return NextResponse.json({ 
      success: true, 
      message: "La sincronización local ha sido desactivada. El sistema ahora opera exclusivamente en Neon Cloud." 
    });
  },
  { requiredPermission: "database:manage" }
);

