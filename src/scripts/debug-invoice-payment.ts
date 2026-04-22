import * as dotenv from "dotenv";
dotenv.config();
import { db } from "../lib/db";
import { facturasClientes, clientes, pagosClientes, cajas } from "../lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

async function debug() {
  const invoiceNumber = "FAC-2026-00280";
  console.log(`Checking invoice: ${invoiceNumber}`);

  // Find the invoice
  const [invoice] = await db
    .select()
    .from(facturasClientes)
    .where(eq(facturasClientes.numeroFactura, invoiceNumber));

  if (!invoice) {
    console.error("Invoice not found");
    return;
  }

  console.log("Invoice found:", {
    id: invoice.id,
    numero: invoice.numeroFactura,
    clienteId: invoice.clienteId,
    total: invoice.total,
    estado: invoice.estado,
    fecha: invoice.fechaFactura,
  });

  // Find the client
  const [client] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, invoice.clienteId));

  if (client) {
    console.log("Client found:", {
      id: client.id,
      nombre: client.nombre,
      apellidos: client.apellidos,
    });
  }

  // Find payments for this invoice
  const payments = await db
    .select({
      payment: pagosClientes,
      caja: cajas.nombre
    })
    .from(pagosClientes)
    .leftJoin(cajas, eq(pagosClientes.cajaId, cajas.id))
    .where(eq(pagosClientes.facturaId, invoice.id));

  console.log(`Found ${payments.length} payments:`);
  payments.forEach((p, i) => {
    console.log(`Payment ${i + 1}:`, {
      id: p.payment.id,
      monto: p.payment.monto,
      fecha: p.payment.fechaPago,
      estado: p.payment.estado,
      metodo: p.payment.metodoPago,
      caja: p.caja,
    });
  });

  // Check if there are any payments for this client today not linked to the invoice
  const today = new Date().toISOString().split('T')[0];
  const otherPayments = await db
    .select({
        payment: pagosClientes,
        caja: cajas.nombre
    })
    .from(pagosClientes)
    .leftJoin(cajas, eq(pagosClientes.cajaId, cajas.id))
    .where(
        and(
            eq(pagosClientes.clienteId, invoice.clienteId),
            eq(pagosClientes.fechaPago, today)
        )
    );

  console.log(`Client payments today: ${otherPayments.length}`);
  otherPayments.forEach((p, i) => {
      console.log(`Client Payment ${i + 1}:`, {
          id: p.payment.id,
          facturaId: p.payment.facturaId,
          monto: p.payment.monto,
          caja: p.caja
      });
  });
}

debug().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
