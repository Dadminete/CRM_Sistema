import { db } from './src/lib/db';
import { sesionesCaja, movimientosContables } from './src/lib/db/schema';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';

async function run() {
  const sessions = await db.select().from(sesionesCaja).limit(2);
  console.log('Sample sessions:');
  
  for (const s of sessions) {
    console.log(`\nSession ${s.id} for Caja ${s.cajaId}`);
    console.log(`Apertura: ${s.fechaApertura}, Cierre: ${s.fechaCierre}, Estado: ${s.estado}`);
    
    // Attempt 1: Raw logic from route
    const baseFilters = [eq(movimientosContables.cajaId, s.cajaId), gte(movimientosContables.fecha, s.fechaApertura)];
    if (s.estado !== 'abierta' && s.fechaCierre) {
      baseFilters.push(lte(movimientosContables.fecha, s.fechaCierre));
    }
    
    const [ingresos] = await db
      .select({ total: sql<string>`COALESCE(SUM(monto), 0)` })
      .from(movimientosContables)
      .where(and(...baseFilters, sql`${movimientosContables.tipo} IN ('ingreso', 'traspaso')`));
      
    console.log('Ingresos query result:', ingresos);

    // Attempt 2: Count all movements for this cajaId
    const allCajaMovs = await db
      .select({ count: sql`COUNT(*)` })
      .from(movimientosContables)
      .where(eq(movimientosContables.cajaId, s.cajaId));
    console.log('All movements for this caja:', allCajaMovs[0].count);

    // Attempt 3: Movements for this caja inside the time range without tipo filter
    const timeMovs = await db
      .select({ count: sql`COUNT(*)` })
      .from(movimientosContables)
      .where(and(...baseFilters));
    console.log('Movements in time range:', timeMovs[0].count);
    
    // Attempt 4: See actual types of movements in the time range
    const types = await db
      .select({ tipo: movimientosContables.tipo, count: sql`COUNT(*)` })
      .from(movimientosContables)
      .where(and(...baseFilters))
      .groupBy(movimientosContables.tipo);
    console.log('Types in time range:', types);
  }
  
  process.exit(0);
}
run();
