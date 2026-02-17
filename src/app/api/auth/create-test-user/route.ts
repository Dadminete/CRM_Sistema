import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    console.log("🔍 Checking existing users...");

    // Check existing users
    const existingUsers = await db
      .select({
        username: usuarios.username,
        nombre: usuarios.nombre,
        activo: usuarios.activo,
      })
      .from(usuarios)
      .limit(5);

    console.log("Existing users:", existingUsers);

    // Create test user with bcrypt password
    const testUsername = "admin";
    const testPassword = "admin123";
    const hashedPassword = await hashPassword(testPassword);

    // Check if user already exists
    const [existing] = await db.select().from(usuarios).where(eq(usuarios.username, testUsername)).limit(1);

    if (existing) {
      console.log(`User '${testUsername}' already exists. Updating password...`);
      await db.update(usuarios).set({ passwordHash: hashedPassword }).where(eq(usuarios.username, testUsername));

      return NextResponse.json({
        success: true,
        message: "Password updated for existing user",
        username: testUsername,
        password: testPassword,
        existingUsers: existingUsers.map((u) => u.username),
      });
    } else {
      console.log(`Creating new user '${testUsername}'...`);
      await db.insert(usuarios).values({
        username: testUsername,
        nombre: "Admin",
        apellido: "User",
        passwordHash: hashedPassword,
        activo: true,
      });

      return NextResponse.json({
        success: true,
        message: "New user created",
        username: testUsername,
        password: testPassword,
        existingUsers: existingUsers.map((u) => u.username),
      });
    }
  } catch (error: any) {
    console.error("Error creating test user:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
