import "dotenv/config";
import { db } from "./src/lib/db";
import { pagosClientes, movimientosContables, cajas } from "./src/lib/db/schema";
import { eq, sql } from "drizzle-orm";

async function fixPayment() {
  const invoiceNumber = "FAC-2026-00319";
  const paymentNumber = "PAG-2047";
  const amount = 1750.00;
  const cajaPrincipalId = "c5ab2edc-d32c-494d-b454-d1731c6c31df";
  const papeleriaId = "2ed1e8c1-0428-457f-b786-1af6d2b3cb01";

  console.log(`🚀 Starting fix for Invoice ${invoiceNumber} / Payment ${paymentNumber}\n`);

  try {
    await db.transaction(async (tx) => {
      // 1. Update Payment
      console.log("Updating payment record...");
      await tx.update(pagosClientes)
        .set({ cajaId: cajaPrincipalId })
        .where(eq(pagosClientes.numeroPago, paymentNumber));

      // 2. Update Movement
      console.log("Updating accounting movement...");
      await tx.update(movimientosContables)
        .set({ cajaId: cajaPrincipalId })
        .where(eq(movimientosContables.descripcion, `Pago de factura ${paymentNumber} - Ivelise Berroa Castro`));

      // 3. Adjust Balances
      console.log("Adjusting cash box balances...");
      
      // Subtract from Papelería
      await tx.update(cajas)
        .set({ saldoActual: sql`${cajas.saldoActual} - ${amount}` })
        .where(eq(cajas.id, papeleriaId));
        
      // Add to Caja Principal
      await tx.update(cajas)
        .set({ saldoActual: sql`${cajas.saldoActual} + ${amount}` })
        .where(eq(cajas.id, cajaPrincipalId));
    });

    console.log("\n✅ Fix applied successfully!");
  } catch (error) {
    console.error("\n❌ Error applying fix:", error);
  }

  process.exit(0);
}

fixPayment();
