import 'dotenv/config';
import { db } from './src/lib/db/index';
import { sql } from 'drizzle-orm';

async function run() {
    console.log("--- Today's Income: Feb 23 ---");
    const r = await db.execute(sql`
    SELECT mc.monto, mc.descripcion, cc.nombre as categoria, mc.fecha
    FROM movimientos_contables mc
    INNER JOIN categorias_cuentas cc ON cc.id = mc.categoria_id
    WHERE mc.tipo = 'ingreso' 
      AND mc.fecha >= '2026-02-23'
    ORDER BY mc.fecha DESC
  `);
    console.log(JSON.stringify(r.rows, null, 2));

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
