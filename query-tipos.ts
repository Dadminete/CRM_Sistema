import { db } from './src/lib/db';
import { movimientosContables } from './src/lib/db/schema';
import { sql } from 'drizzle-orm';

async function run() {
  const res = await db.select({
    tipo: movimientosContables.tipo,
    count: sql`COUNT(*)`
  }).from(movimientosContables).groupBy(movimientosContables.tipo);
  
  console.log('Tipos de movimientos contables:');
  console.log(res);

  const resFechas = await db.select({
    fecha: movimientosContables.fecha
  }).from(movimientosContables).limit(3);
  
  console.log('Sample fechas:');
  console.log(resFechas);

  process.exit(0);
}
run();
