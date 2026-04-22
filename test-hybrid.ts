import { db } from "./src/lib/db";
import { usuarios, roles } from "./src/lib/db/schema";
import * as dotenv from "dotenv";

dotenv.config();

async function testHybridDb() {
  console.log("--- Testing Hybrid DB Architecture ---");
  try {
    // 1. Test Select (Read from Local)
    console.log("[1/3] Testing Read (Local)...");
    const localUsers = await db.select().from(usuarios).limit(5);
    console.log(`Found ${localUsers.length} users in local DB.`);
    
    if (localUsers.length > 0) {
      console.log("Sample local user:", localUsers[0].nombre);
    }

    // 2. Test Insert (Dual Write)
    console.log("[2/3] Testing Dual Write (Insert)...");
    const testUsername = `test-hybrid-${Date.now()}`;
    const testEmail = `${testUsername}@example.com`;
    
    // We need a valid role ID for the test user if any, but usuarios table doesn't seem to have rolId directly in its schema definition (it might be in a join table)
    // Looking at schema.ts line 2778+, there is no rolId. 
    // It likely uses a mapping table like usuarios_roles.

    await db.insert(usuarios).values({
      username: testUsername,
      email: testEmail,
      nombre: "User Prueba",
      apellido: "Hibrida",
      passwordHash: "dummy-hash",
      updatedAt: new Date().toISOString(),
    });
    
    console.log("Insert command sent. If internet is active, it should sync to Neon.");

    // 3. Verify Local Persistence
    console.log("[3/3] Verifying Local Persistence...");
    const verified = await db.select().from(usuarios).where(sql`${usuarios.username} = ${testUsername}`);
    
    if (verified.length > 0) {
      console.log("SUCCESS: Test user was saved locally.");
      
      // Cleanup
      console.log("Cleaning up test user...");
      await db.delete(usuarios).where(sql`${usuarios.username} = ${testUsername}`);
      console.log("Cleanup done.");
    } else {
      console.error("FAILURE: Test user not found in local database.");
    }

  } catch (error) {
    console.error("CRITICAL ERROR during hybrid test:", error);
  } finally {
    process.exit(0);
  }
}

// Helper for sql template literal if needed
import { sql } from "drizzle-orm";

testHybridDb();
