import 'dotenv/config';
import { db } from './src/lib/db/index';
import { sql } from 'drizzle-orm';

async function run() {
    console.log("--- Future Dated Movements: Feb 2026 ---");
    const r = await db.execute(sql`
    SELECT mc.monto, mc.fecha, mc.descripcion
    FROM movimientos_contables mc
    INNER JOIN categorias_cuentas cc ON cc.id = mc.categoria_id
    WHERE cc.nombre = 'Ingresos por Servicios de Internet'
      AND mc.tipo = 'ingreso'
      AND mc.fecha > '2026-02-28 23:59:59'
    ORDER BY mc.fecha DESC
  `);
    console.log(JSON.stringify(r.rows, null, 2));

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
