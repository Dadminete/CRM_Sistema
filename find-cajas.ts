import "dotenv/config";
import { db } from "./src/lib/db";
import { cajas } from "./src/lib/db/schema";
import { eq } from "drizzle-orm";

async function findCajaPrincipal() {
  const allCajas = await db.select().from(cajas);
  console.log(JSON.stringify(allCajas, null, 2));
  process.exit(0);
}

findCajaPrincipal();
