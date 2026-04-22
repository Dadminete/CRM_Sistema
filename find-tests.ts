import 'dotenv/config';
import { db } from './src/lib/db/index';
import { sql } from 'drizzle-orm';

async function run() {
    console.log("--- Known Test/Extra Movements: Feb 2026 ---");
    const r = await db.execute(sql`
    SELECT mc.monto, mc.descripcion, mc.fecha
    FROM movimientos_contables mc
    INNER JOIN categorias_cuentas cc ON cc.id = mc.categoria_id
    WHERE cc.nombre = 'Ingresos por Servicios de Internet'
      AND mc.tipo = 'ingreso'
      AND mc.fecha >= '2026-02-01'
      AND (mc.descripcion ILIKE '%prueba%' OR mc.descripcion ILIKE '%test%' OR mc.descripcion ILIKE '%demo%')
  `);
    console.log(JSON.stringify(r.rows, null, 2));

    const totalTest = r.rows.reduce((s, r) => s + parseFloat(r.monto), 0);
    console.log("Total Test:", totalTest);

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
