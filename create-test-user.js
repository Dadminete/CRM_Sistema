import { db } from "./src/lib/db/index.js";
import { usuarios } from "./src/lib/db/schema.js";
import { hashPassword } from "./src/lib/auth.js";
import { eq } from "drizzle-orm";

async function createTestUser() {
  console.log("🔍 Checking existing users...\n");

  // Check existing users
  const existingUsers = await db
    .select({
      username: usuarios.username,
      nombre: usuarios.nombre,
      activo: usuarios.activo,
      passwordHashPreview: usuarios.passwordHash,
    })
    .from(usuarios)
    .limit(5);

  console.log("Existing users:");
  existingUsers.forEach((user) => {
    console.log(`- ${user.username} (${user.nombre}) - Active: ${user.activo}`);
    console.log(`  Password hash preview: ${user.passwordHashPreview?.substring(0, 30)}...`);
  });

  console.log("\n🔐 Creating test user with bcrypt password...\n");

  // Create test user with bcrypt password
  const testUsername = "admin";
  const testPassword = "admin123";
  const hashedPassword = await hashPassword(testPassword);

  try {
    // Check if user already exists
    const [existing] = await db.select().from(usuarios).where(eq(usuarios.username, testUsername)).limit(1);

    if (existing) {
      console.log(`User '${testUsername}' already exists. Updating password...`);
      await db.update(usuarios).set({ passwordHash: hashedPassword }).where(eq(usuarios.username, testUsername));
      console.log("✅ Password updated!");
    } else {
      console.log(`Creating new user '${testUsername}'...`);
      await db.insert(usuarios).values({
        username: testUsername,
        nombre: "Admin",
        apellido: "User",
        passwordHash: hashedPassword,
        activo: true,
      });
      console.log("✅ User created!");
    }

    console.log("\n📋 Login credentials:");
    console.log(`Username: ${testUsername}`);
    console.log(`Password: ${testPassword}`);
    console.log(`\nBcrypt hash: ${hashedPassword.substring(0, 30)}...`);
  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

createTestUser();
