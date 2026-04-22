import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

async function resetAlbaAccount() {
  try {
    console.log("🔄 Resetting Alba's account...");

    // Get current user data
    const [user] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.username, "Alba"))
      .limit(1);

    if (!user) {
      console.log("❌ User Alba not found");
      return;
    }

    console.log("✅ Found user Alba:");
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Active: ${user.activo}`);
    console.log(`  - Failed attempts: ${user.intentosFallidos}`);
    console.log(`  - Blocked until: ${user.bloqueadoHasta}`);

    // Reset failed attempts and blocked status
    const updatedUser = await db
      .update(usuarios)
      .set({
        intentosFallidos: 0,
        bloqueadoHasta: null,
      })
      .where(eq(usuarios.id, user.id))
      .returning();

    console.log("✅ Account reset successfully:");
    console.log(`  - Failed attempts: ${updatedUser[0].intentosFallidos}`);
    console.log(`  - Blocked until: ${updatedUser[0].bloqueadoHasta}`);
    console.log("\nAlba can now try logging in again with her correct password.");
    console.log("If the password is still invalid, we'll need to reset it.");
  } catch (error) {
    console.error("❌ Error resetting account:", error);
  }
}

resetAlbaAccount();
