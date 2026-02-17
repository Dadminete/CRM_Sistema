import { db } from "../lib/db";
import { usuarios } from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  try {
    console.log("Checking for existing users...");
    const existingUsers = await db.select().from(usuarios).limit(1);

    if (existingUsers.length > 0) {
      console.log("Found existing user:");
      console.log(`ID: ${existingUsers[0].id}`);
      console.log(`Email: ${existingUsers[0].email}`);
      console.log(`Nombre: ${existingUsers[0].nombre}`);
    } else {
      console.log("No users found. Creating default admin user...");
      const newUser = await db
        .insert(usuarios)
        .values({
          nombre: "Admin User",
          email: "admin@system.com",
          password: "hashed_password_placeholder", // In a real app, hash this!
          rol: "admin",
          estado: "activo",
        })
        .returning();

      console.log("Created new user:");
      console.log(`ID: ${newUser[0].id}`);
    }
  } catch (error) {
    console.error("Error checking/seeding user:", error);
  } finally {
    process.exit(0);
  }
}

main();
