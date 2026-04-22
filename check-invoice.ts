import "dotenv/config";
import { db } from "./src/lib/db";
import { facturasClientes, pagosClientes, movimientosContables, cajas } from "./src/lib/db/schema";
import { eq, and } from "drizzle-orm";

async function checkInvoice() {
  const invoiceNumber = "FAC-2026-00319";
  
  console.log(`🔍 Checking invoice: ${invoiceNumber}\n`);

  // 1. Find invoice
  const [invoice] = await db
    .select()
    .from(facturasClientes)
    .where(eq(facturasClientes.numeroFactura, invoiceNumber))
    .limit(1);

  if (!invoice) {
    console.error("❌ Invoice not found!");
    process.exit(1);
  }

  console.log("Invoice data:", JSON.stringify(invoice, null, 2));

  // 2. Find payments for this invoice
  const payments = await db
    .select()
    .from(pagosClientes)
    .where(eq(pagosClientes.facturaId, invoice.id));

  console.log("\nPayments linked to invoice:", JSON.stringify(payments, null, 2));

  // 3. Find movements for these payments or the invoice
  // Check if any payment is linked to a caja
  for (const payment of payments) {
    if (payment.cajaId) {
       const [caja] = await db.select().from(cajas).where(eq(cajas.id, payment.cajaId)).limit(1);
       console.log(`\nPayment ${payment.numeroPago} is linked to Caja: ${caja?.nombre || payment.cajaId}`);
    }
  }

  // 4. Search movements in movimientosContables that might match
  const movements = await db
    .select()
    .from(movimientosContables)
    .where(eq(movimientosContables.descripcion, `Pago de factura ${invoiceNumber}`));
  
  if (movements.length === 0) {
    // Try searching for the payment numbers in description
    for (const payment of payments) {
       const pMovements = await db
         .select()
         .from(movimientosContables)
         .where(sql`${movimientosContables.descripcion} LIKE ${`%${payment.numeroPago}%`}`);
       movements.push(...pMovements);
    }
  }

  console.log("\nMovements found:", JSON.stringify(movements, null, 2));
  
  process.exit(0);
}

// Helper to use sql in scratch script if needed
import { sql } from "drizzle-orm";

checkInvoice();
