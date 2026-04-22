import 'dotenv/config';
import { db } from './src/lib/db/index';
import { sql } from 'drizzle-orm';

async function run() {
    console.log("--- Offsetting Expenses: Ingresos por Servicios de Internet (Feb 2026) ---");

    const r = await db.execute(sql`
    SELECT mc.id, mc.monto, mc.fecha, mc.descripcion, cc.nombre as categoria
    FROM movimientos_contables mc
    INNER JOIN categorias_cuentas cc ON cc.id = mc.categoria_id
    WHERE mc.tipo = 'gasto'
      AND mc.fecha >= '2026-02-01'
      AND cc.nombre = 'Ingresos por Servicios de Internet'
    ORDER BY mc.fecha DESC
  `);

    let total = 0;
    for (const row of r.rows) {
        console.log(`[${row.fecha}] $${row.monto} - ${row.descripcion}`);
        total += parseFloat(row.monto);
    }

    console.log(`\nCOUNT: ${r.rows.length}`);
    console.log(`TOTAL EXPENSE (OFFSET): ${total}`);

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
