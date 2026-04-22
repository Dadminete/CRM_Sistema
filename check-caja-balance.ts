import { db } from "@/lib/db";
import { cajas, movimientosContables } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

async function auditCajaBalance() {
  try {
    // 1. Get the main box
    const mainBox = await db.query.cajas.findFirst({
      where: eq(cajas.nombre, "Caja Principal"), // Adjust name if needed
    });

    if (!mainBox) {
      console.log("❌ Caja Principal not found");
      return;
    }

    console.log("📦 CAJA AUDIT:", mainBox.nombre);
    console.log("Current saldo_actual:", mainBox.saldoActual);
    console.log("---");

    // 2. Get all movements for this box
    const movements = await db
      .select()
      .from(movimientosContables)
      .where(eq(movimientosContables.cajaId, mainBox.id))
      .orderBy(desc(movimientosContables.fecha));

    console.log(`Total movements: ${movements.length}`);

    // 3. Calculate balance from movements
    let calculatedBalance = 0;
    const recentMovements = movements.slice(0, 20);

    recentMovements.forEach((m) => {
      const monto = parseFloat(m.monto.toString());
      const change = m.tipo === "ingreso" ? monto : -monto;
      calculatedBalance += change;
      console.log(
        `${m.fecha} | ${m.tipo.toUpperCase().padEnd(7)} | $${monto.toFixed(2).padStart(10)} | ${m.descripcion?.substring(0, 40)}`
      );
    });

    console.log("---");

    // 4. Check for duplicates (same description, amount, type within 1 minute)
    const movementMap = new Map<string, typeof movements[0][]>();
    movements.forEach((m) => {
      const key = `${m.tipo}-${m.monto}-${m.descripcion}`;
      if (!movementMap.has(key)) movementMap.set(key, []);
      movementMap.get(key)!.push(m);
    });

    console.log("🔍 Checking for duplicates...");
    let duplicateCount = 0;
    movementMap.forEach((items, key) => {
      if (items.length > 1) {
        // Check if timestamps are very close (within 60 seconds)
        const timestamps = items.map((i) => new Date(i.fecha).getTime());
        const diffs = [];
        for (let i = 1; i < timestamps.length; i++) {
          diffs.push(timestamps[i] - timestamps[i - 1]);
        }
        if (diffs.some((d) => d < 60000)) {
          duplicateCount++;
          console.log(`⚠️  Possible duplicate: ${key}`);
          items.forEach((m) => {
            console.log(`   ID: ${m.id} | ${m.fecha}`);
          });
        }
      }
    });

    if (duplicateCount === 0) {
      console.log("✅ No duplicates found");
    }

    // 5. Show summary
    console.log("---");
    console.log(`Current DB saldo_actual: $${parseFloat(mainBox.saldoActual.toString()).toFixed(2)}`);
    console.log(`Calculated from recent 20: $${calculatedBalance.toFixed(2)}`);
    const diff = parseFloat(mainBox.saldoActual.toString()) - calculatedBalance;
    console.log(`Difference: $${diff.toFixed(2)} ${diff === 4500 ? "⚠️  MATCHES THE REPORTED EXCESS!" : ""}`);

  } catch (error) {
    console.error("Error:", error);
  }
}

auditCajaBalance();
