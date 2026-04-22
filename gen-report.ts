import 'dotenv/config';
import { db } from './src/lib/db/index';
import { sql } from 'drizzle-orm';

async function run() {
    const r = await db.execute(sql`
    SELECT mc.monto, mc.fecha, mc.descripcion, mc.metodo
    FROM movimientos_contables mc
    INNER JOIN categorias_cuentas cc ON cc.id = mc.categoria_id
    WHERE cc.nombre = 'Ingresos por Servicios de Internet'
      AND mc.tipo = 'ingreso'
      AND mc.fecha >= '2026-02-01'
      AND NOT (cc.nombre ILIKE '%papeler%' OR mc.descripcion ILIKE '%papeler%' OR mc.descripcion ILIKE '#VENTA-%')
    ORDER BY mc.fecha ASC
  `);

    let total = 0;
    let csv = "ID,Fecha,Monto,Metodo,Descripcion\n";
    for (let i = 0; i < r.rows.length; i++) {
        const row = r.rows[i];
        csv += `${i + 1},${row.fecha},${row.monto},${row.metodo},\"${row.descripcion.replace(/"/g, '""')}\"\n`;
        total += parseFloat(row.monto);
    }

    require('fs').writeFileSync('feb-internet-report.csv', csv);
    console.log("Total records:", r.rows.length);
    console.log("Total sum:", total);

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
