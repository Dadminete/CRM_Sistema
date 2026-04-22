import 'dotenv/config';
import { db } from './src/lib/db/index';
import { sql } from 'drizzle-orm';

async function run() {
    console.log("--- Exact Timestamps Duplicates: Internet (Feb 2026) ---");
    const r = await db.execute(sql`
    SELECT monto, fecha, descripcion, COUNT(*)
    FROM movimientos_contables mc
    INNER JOIN categorias_cuentas cc ON cc.id = mc.categoria_id
    WHERE cc.nombre = 'Ingresos por Servicios de Internet'
      AND mc.tipo = 'ingreso'
      AND mc.fecha >= '2026-02-01'
    GROUP BY monto, fecha, descripcion
    HAVING COUNT(*) > 1
    ORDER BY fecha DESC
  `);
    console.log(JSON.stringify(r.rows, null, 2));

    const totalDup = r.rows.reduce((s, r) => s + (parseFloat(r.monto) * (parseInt(r.count) - 1)), 0);
    console.log("Total Excess from Duplicates:", totalDup);

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
