import 'dotenv/config';
import { db } from './src/lib/db/index';
import { sql } from 'drizzle-orm';

async function run() {
    console.log("--- Monthly Comparison: Internet Income ---");
    const r = await db.execute(sql`
    SELECT 
      DATE_TRUNC('month', mc.fecha) as month,
      SUM(CAST(mc.monto AS NUMERIC)) as total,
      COUNT(*) as count
    FROM movimientos_contables mc
    INNER JOIN categorias_cuentas cc ON cc.id = mc.categoria_id
    WHERE cc.nombre = 'Ingresos por Servicios de Internet'
      AND mc.tipo = 'ingreso'
      AND mc.fecha >= '2026-01-01'
    GROUP BY month
    ORDER BY month DESC
  `);
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
