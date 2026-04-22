import "dotenv/config";
import { db } from "./src/lib/db/index";
import { movimientosContables, cajas } from "./src/lib/db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
    try {
        // 1. Find Caja Principal
        const cajaRows = await db
            .select()
            .from(cajas)
            .where(eq(cajas.nombre, "Caja Principal"))
            .limit(1);

        if (cajaRows.length === 0) {
            console.log("Caja Principal no encontrada.");
            process.exit(1);
        }

        const caja = cajaRows[0];
        const cajaId = caja.id;

        // 2. Sum Movements
        const movements = await db
            .select()
            .from(movimientosContables)
            .where(eq(movimientosContables.cajaId, cajaId));

        let netMovements = 0;
        movements.forEach(m => {
            const amount = Number(m.monto);
            if (m.tipo === "ingreso") {
                netMovements += amount;
            } else if (m.tipo === "gasto") {
                netMovements -= amount;
            }
        });

        const calculatedBalance = Number(caja.saldoInicial) + netMovements;

        console.log(`Caja: ${caja.nombre}`);
        console.log(`Saldo Inicial: ${caja.saldoInicial}`);
        console.log(`Neto Movimientos: ${netMovements}`);
        console.log(`Saldo Calculado: ${calculatedBalance}`);
        console.log(`Saldo Actual DB: ${caja.saldoActual}`);

        // 3. Update Current Balance
        await db
            .update(cajas)
            .set({
                saldoActual: calculatedBalance.toString(),
                updatedAt: new Date().toISOString()
            })
            .where(eq(cajas.id, cajaId));

        console.log("Balance actualizado correctamente.");
        process.exit(0);
    } catch (error) {
        console.error("Error reconciiling balance:", error);
        process.exit(1);
    }
}

main();
