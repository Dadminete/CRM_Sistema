import 'dotenv/config';
import { db } from './src/lib/db/index';
import { sql } from 'drizzle-orm';

async function run() {
    console.log("--- Top Expenses: Feb 2026 ---");
    const r = await db.execute(sql`
    SELECT mc.monto, mc.descripcion, cc.nombre as categoria, mc.fecha, mc.tipo
    FROM movimientos_contables mc
    INNER JOIN categorias_cuentas cc ON cc.id = mc.categoria_id
    WHERE mc.tipo = 'gasto' 
      AND mc.fecha >= '2026-02-01'
    ORDER BY CAST(mc.monto AS NUMERIC) DESC
    LIMIT 20
  `);
    console.log(JSON.stringify(r.rows, null, 2));

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
