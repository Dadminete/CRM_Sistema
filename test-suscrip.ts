import { db } from './src/lib/db';
import { clientes } from './src/lib/db/schema';
import { sql } from 'drizzle-orm';

async function run() {
  const res = await db.select({
    id: clientes.id,
    tiene: sql<boolean>`EXISTS (SELECT 1 FROM suscripciones s WHERE s.cliente_id = ${clientes.id} AND s.estado = 'activo')`
  }).from(clientes).limit(3);
  console.log(res);
  
  const allSus = await db.execute(sql`SELECT * FROM suscripciones LIMIT 1`);
  console.log('Sample suscripcion:', allSus.rows?.[0]);

  process.exit(0);
}
run();
