import "dotenv/config";
import { db } from "./src/lib/db";
import { sql } from "drizzle-orm";

async function checkPendingInvoices() {
  try {
    const result = await db.execute(sql`
      SELECT 
        f.id,
        f.numero_factura,
        f.estado,
        f.total,
        f.saldo_pagado,
        cpc.monto_pendiente
      FROM facturas_clientes f
      LEFT JOIN cuentas_por_cobrar cpc ON f.id = cpc.factura_id
      WHERE f.estado IN ('pendiente', 'parcial', 'pago parcial', 'adelantado', 'pago adelantado')
    `);

    const rows = result.rows;
    console.log(`Found ${rows.length} pending/partial invoices.\n`);

    let sumPendienteOnly = 0;
    let sumPartialOnly = 0;
    let sumAllPendingMonto = 0;

    for (const row of rows as any[]) {
      const monto = Number(row.monto_pendiente || 0);
      const estado = row.estado?.toLowerCase() || "";
      
      if (estado === "pendiente") {
        sumPendienteOnly += monto;
      } else {
        sumPartialOnly += monto;
      }
      sumAllPendingMonto += monto;
      
      const calculatedPending = Number(row.total) - Number(row.saldo_pagado);
      if (Math.abs(calculatedPending - monto) > 0.01) {
         console.log(`⚠️ Mismatch in ${row.numero_factura}: Total-Pagado=${calculatedPending}, MontoPendiente=${monto}`);
      }
    }

    console.log(`\nTotal Pendiente (only 'pendiente' status): ${sumPendienteOnly}`);
    console.log(`Total Parcial (other statuses): ${sumPartialOnly}`);
    console.log(`Sum of all MontoPendiente: ${sumAllPendingMonto}`);

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

checkPendingInvoices();
