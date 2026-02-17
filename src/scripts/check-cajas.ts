import { eq, desc } from "drizzle-orm";

import { db } from "../lib/db";
import { cajas, sesionesCaja } from "../lib/db/schema";

async function checkCajas() {
  const allCajas = await db.select().from(cajas);
  console.log("Existing Boxes:", JSON.stringify(allCajas, null, 2));

  for (const caja of allCajas) {
    const lastSession = await db
      .select()
      .from(sesionesCaja)
      .where(eq(sesionesCaja.cajaId, caja.id))
      .orderBy(desc(sesionesCaja.fechaApertura))
      .limit(1);

    console.log(`Last session for ${caja.nombre}:`, JSON.stringify(lastSession, null, 2));
  }
}

checkCajas().catch(console.error);
