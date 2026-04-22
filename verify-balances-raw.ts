import "dotenv/config";
import { db } from "./src/lib/db";
import { cuentasBancarias, movimientosContables, banks } from "./src/lib/db/schema";
import { eq, sql } from "drizzle-orm";

async function verifyBalanceFormula() {
  try {
    const result = await db.execute(sql`
      SELECT 
        cb.id,
        cb.nombre_oficial_cuenta,
        cb.saldo_inicial,
        COALESCE((
          SELECT SUM(CAST(m.monto AS DECIMAL)) 
          FROM movimientos_contables m 
          WHERE m.cuenta_bancaria_id = cb.id AND m.tipo = 'ingreso'
        ), 0) as total_ingresos,
        COALESCE((
          SELECT SUM(CAST(m.monto AS DECIMAL)) 
          FROM movimientos_contables m 
          WHERE m.cuenta_bancaria_id = cb.id AND m.tipo = 'gasto'
        ), 0) as total_gastos
      FROM cuentas_bancarias cb
      WHERE cb.activo = true
    `);

    const rows = result.rows;
    console.log(`Found ${rows.length} active accounts.\n`);

    let grandTotal = 0;

    for (const row of rows as any[]) {
      const initial = Number(row.saldo_inicial);
      const ingresos = Number(row.total_ingresos);
      const gastos = Number(row.total_gastos);
      const balance = initial + ingresos - gastos;
      
      grandTotal += balance;

      console.log(`Account: ${row.nombre_oficial_cuenta}`);
      console.log(`  Initial: ${initial}`);
      console.log(`  Ingresos: ${ingresos}`);
      console.log(`  Gastos: ${gastos}`);
      console.log(`  Calculated Balance: ${balance}\n`);
    }

    console.log(`GRAND TOTAL: ${grandTotal}`);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

verifyBalanceFormula();
