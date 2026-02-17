import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserBySession, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({
        success: true,
        user: null,
      });
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({
        success: true,
        user: null,
      });
    }

    // Get user from session
    const user = await getUserBySession(payload.sessionId);

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error("Session check error:", error);
    return NextResponse.json({ success: false, error: "An error occurred checking session" }, { status: 500 });
  }
}
