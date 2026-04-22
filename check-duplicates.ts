import 'dotenv/config';
import { db } from './src/lib/db/index';
import { sql } from 'drizzle-orm';

async function run() {
    console.log("--- Suspicious Patterns: Internet (Feb 2026) ---");

    // Find factures (#FAC-XXXX) that appear more than once
    const r = await db.execute(sql`
    WITH facture_counts AS (
      SELECT 
        regexp_replace(descripcion, '.*(#FAC-[0-9-]+).*', '\\1') as facture_num,
        COUNT(*) as count,
        SUM(CAST(monto AS NUMERIC)) as total_monto
      FROM movimientos_contables mc
      INNER JOIN categorias_cuentas cc ON cc.id = mc.categoria_id
      WHERE cc.nombre = 'Ingresos por Servicios de Internet'
        AND mc.tipo = 'ingreso'
        AND mc.fecha >= '2026-02-01'
        AND mc.descripcion LIKE '%#FAC-%'
      GROUP BY facture_num
      HAVING COUNT(*) > 1
    )
    SELECT fc.*, mc.fecha, mc.monto, mc.descripcion
    FROM facture_counts fc
    JOIN movimientos_contables mc ON mc.descripcion LIKE '%' || fc.facture_num || '%'
    WHERE mc.fecha >= '2026-02-01'
    ORDER BY fc.facture_num, mc.fecha
  `);

    console.log(JSON.stringify(r.rows, null, 2));

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
