import "dotenv/config";
import { db } from "./src/lib/db/index";
import { movimientosContables, cajas } from "./src/lib/db/schema";
import { desc, eq } from "drizzle-orm";

async function main() {
    try {
        const lastMovements = await db
            .select()
            .from(movimientosContables)
            .orderBy(desc(movimientosContables.fecha))
            .limit(10);

        console.log("MOVIMIENTOS:");
        lastMovements.forEach(m => {
            console.log(`- ID: ${m.id}, Tipo: ${m.tipo}, Monto: ${m.monto}, Desc: ${m.descripcion}, Fecha: ${m.fecha}, Caja: ${m.cajaId}`);
        });

        const cajaPrincipal = await db
            .select()
            .from(cajas)
            .where(eq(cajas.nombre, "Caja Principal"))
            .limit(1);

        console.log("\nCAJA PRINCIPAL:");
        if (cajaPrincipal.length > 0) {
            const c = cajaPrincipal[0];
            console.log(`- ID: ${c.id}, Nombre: ${c.nombre}, Saldo: ${c.saldoActual}, Updated: ${c.updatedAt}`);
        } else {
            console.log("Caja Principal no encontrada.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

main();
