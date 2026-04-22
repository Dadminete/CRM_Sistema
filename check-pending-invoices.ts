import "dotenv/config";
import { db } from "./src/lib/db";
import { facturasClientes, cuentasPorCobrar } from "./src/lib/db/schema";
import { eq, or } from "drizzle-orm";

async function checkPendingInvoices() {
  const result = await db
    .select({
      id: facturasClientes.id,
      numero: facturasClientes.numeroFactura,
      estado: facturasClientes.estado,
      total: facturasClientes.total,
      saldoPagado: facturasClientes.saldoPagado,
      montoPendiente: cuentasPorCobrar.montoPendiente,
    })
    .from(facturasClientes)
    .leftJoin(cuentasPorCobrar, eq(facturasClientes.id, cuentasPorCobrar.facturaId))
    .where(
      or(
        eq(facturasClientes.estado, "pendiente"),
        eq(facturasClientes.estado, "parcial"),
        eq(facturasClientes.estado, "pago parcial"),
        eq(facturasClientes.estado, "adelantado"),
        eq(facturasClientes.estado, "pago adelantado"),
      )
    );

  console.log(`Found ${result.length} pending/partial invoices.\n`);

  let sumPendienteOnly = 0;
  let sumPartialOnly = 0;
  let sumAllPendingMonto = 0;

  result.forEach(row => {
    const monto = Number(row.montoPendiente || 0);
    const estado = row.estado?.toLowerCase() || "";
    
    if (estado === "pendiente") {
      sumPendienteOnly += monto;
    } else {
      sumPartialOnly += monto;
    }
    sumAllPendingMonto += monto;
    
    // Check if total - saldoPagado matches montoPendiente
    const calculatedPending = Number(row.total) - Number(row.saldoPagado);
    if (Math.abs(calculatedPending - monto) > 0.01) {
       console.log(`⚠️ Mismatch in ${row.numero}: Total-Pagado=${calculatedPending}, MontoPendiente=${monto}`);
    }
  });

  console.log(`\nTotal Pendiente (only 'pendiente' status): ${sumPendienteOnly}`);
  console.log(`Total Parcial (other statuses): ${sumPartialOnly}`);
  console.log(`Sum of all MontoPendiente: ${sumAllPendingMonto}`);

  process.exit(0);
}

checkPendingInvoices();
