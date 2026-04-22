import { db } from './src/lib/db';
import { movimientosContables } from './src/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

async function run() {
  const cajaId = 'c5ab2edc-d32c-494d-b454-d1731c6c31df';
  const start = '2026-03-24 13:39:23.823553+00';
  const end = '2026-03-24 21:48:04.407+00';

  const movs = await db.select().from(movimientosContables).where(eq(movimientosContables.cajaId, cajaId));
  console.log(`Total movements for Caja Principal: ${movs.length}`);
  if (movs.length > 0) {
    console.log(`First Movement Date: ${movs[0].fecha}`);
    console.log(`Last Movement Date: ${movs[movs.length - 1].fecha}`);
  }

  const inRange = await db
    .select()
    .from(movimientosContables)
    .where(and(eq(movimientosContables.cajaId, cajaId), gte(movimientosContables.fecha, start), lte(movimientosContables.fecha, end)));
  console.log(`Movements exactly in range: ${inRange.length}`);
  process.exit(0);
}
run();
