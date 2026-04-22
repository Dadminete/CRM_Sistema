import "dotenv/config";
import { db } from "../src/lib/db";
import { ventasPapeleria, movimientosContables, cajas } from "../src/lib/db/schema";
import { eq, isNotNull } from "drizzle-orm";

async function run() {
  const anuladas = await db.select().from(ventasPapeleria).where(eq(ventasPapeleria.estado, "CANCELADA"));
  console.log(`Found ${anuladas.length} cancelled sales.`);
  for (const venta of anuladas) {
    console.log(`Venta ${venta.numeroVenta} - Total: ${venta.total} - Caja: ${venta.cajaId} - Movimiento: ${venta.movimientoContableId}`);
  }
}

run().catch(console.error).finally(() => process.exit(0));
