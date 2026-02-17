import * as dotenv from "dotenv";
dotenv.config();
import { db } from "../lib/db";
import { movimientosContables, cajas } from "../lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

async function checkMovements() {
  const today = new Date().toISOString().split("T")[0];
  console.log(`Checking movements for ${today}...`);

  const allCajas = await db.select().from(cajas);
  console.log(
    "Cajas found:",
    allCajas.map((c) => ({ id: c.id, nombre: c.nombre })),
  );

  const papeleria = allCajas.find((c) => c.nombre.toLowerCase().includes("papeleria"));
  if (papeleria) {
    console.log(`Papeleria Caja ID: ${papeleria.id}`);

    // Check all movements for this caja today
    const movements = await db
      .select()
      .from(movimientosContables)
      .where(and(eq(movimientosContables.cajaId, papeleria.id), gte(movimientosContables.fecha, today)));

    console.log(`Found ${movements.length} movements for Papeleria today:`);
    movements.forEach((m) => {
      console.log(`- ID: ${m.id}, Tipo: ${m.tipo}, Monto: ${m.monto}, Fecha: ${m.fecha}, Desc: ${m.descripcion}`);
    });

    // Count by type
    const [ingresos] = await db
      .select({ total: sql<string>`SUM(monto)` })
      .from(movimientosContables)
      .where(
        and(
          eq(movimientosContables.cajaId, papeleria.id),
          eq(movimientosContables.tipo, "ingreso"),
          gte(movimientosContables.fecha, today),
        ),
      );

    console.log(`Total Ingresos calculated: ${ingresos.total || 0}`);
  } else {
    console.log("No Papeleria caja found.");
  }

  // Check any 45 DOP movement today across all cajas
  const any45 = await db
    .select()
    .from(movimientosContables)
    .where(and(eq(movimientosContables.monto, "45"), gte(movimientosContables.fecha, today)));

  if (any45.length > 0) {
    console.log("\nFound 45 DOP movements today:");
    any45.forEach((m) => {
      console.log(`- ID: ${m.id}, CajaID: ${m.cajaId}, Tipo: ${m.tipo}, Fecha: ${m.fecha}, Desc: ${m.descripcion}`);
    });
  } else {
    console.log("\nNo 45 DOP movements found today.");
  }
}

checkMovements().catch(console.error);
