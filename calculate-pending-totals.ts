import "dotenv/config";
import { db } from "./src/lib/db";
import { sql } from "drizzle-orm";

async function calculateRealTotals() {
  try {
    const result = await db.execute(sql`
      SELECT 
        f.estado,
        COUNT(*) as count,
        SUM(cpc.monto_pendiente) as sum_pendiente
      FROM facturas_clientes f
      JOIN cuentas_por_cobrar cpc ON f.id = cpc.factura_id
      WHERE f.estado IN ('pendiente', 'parcial', 'pago parcial', 'adelantado', 'pago adelantado')
      GROUP BY f.estado
    `);

    console.log("Breakdown by status:");
    console.table(result.rows);

    const totalAll = (result.rows as any[]).reduce((sum, row) => sum + Number(row.sum_pendiente), 0);
    const totalPendienteOnly = (result.rows as any[])
      .filter(row => row.estado === 'pendiente')
      .reduce((sum, row) => sum + Number(row.sum_pendiente), 0);

    console.log(`\nTotal (status='pendiente' ONLY): ${totalPendienteOnly}`);
    console.log(`Total (ALL pending/partial/adelantado): ${totalAll}`);

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

calculateRealTotals();
