import 'dotenv/config';
import { db } from './src/lib/db/index';
import { sql } from 'drizzle-orm';

async function run() {
    console.log("--- Jan Internet-only Data ---");
    const r = await db.execute(sql`
    SELECT 
      SUM(CAST(mc.monto AS NUMERIC)) as total,
      COUNT(*) as count
    FROM movimientos_contables mc
    INNER JOIN categorias_cuentas cc ON cc.id = mc.categoria_id
    WHERE cc.nombre = 'Ingresos por Servicios de Internet'
      AND mc.tipo = 'ingreso'
      AND mc.fecha >= '2026-01-01' AND mc.fecha < '2026-02-01'
      AND NOT (cc.nombre ILIKE '%papeler%' OR mc.descripcion ILIKE '%papeler%' OR mc.descripcion ILIKE '#VENTA-%')
  `);
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
