import { db } from "./src/lib/db";
import { productosPapeleria } from "./src/lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  try {
    const p = await db.select().from(productosPapeleria).limit(1);
    console.log("Success:", p);
  } catch(e) {
    console.error("Error:", e);
  }
}
main().then(() => process.exit(0));
