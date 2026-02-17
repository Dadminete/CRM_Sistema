import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, newPassword } = body;

    if (!username || !newPassword) {
      return NextResponse.json({ success: false, error: "Username and new password are required" }, { status: 400 });
    }

    console.log("🔄 Updating password for user:", username);

    // Find user
    const [user] = await db.select().from(usuarios).where(eq(usuarios.username, username)).limit(1);

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    console.log("✅ User found:", user.username);
    console.log("🔑 Old password hash preview:", user.passwordHash?.substring(0, 30));

    // Hash new password with bcrypt
    const hashedPassword = await hashPassword(newPassword);
    console.log("🔐 New bcrypt hash preview:", hashedPassword.substring(0, 30));

    // Update password
    await db.update(usuarios).set({ passwordHash: hashedPassword }).where(eq(usuarios.username, username));

    console.log("✅ Password updated successfully!");

    return NextResponse.json({
      success: true,
      message: "Password updated successfully with bcrypt hash",
      username: username,
      oldHashPreview: user.passwordHash?.substring(0, 30),
      newHashPreview: hashedPassword.substring(0, 30),
    });
  } catch (error: any) {
    console.error("Error updating password:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
