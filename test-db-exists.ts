import * as dotenv from 'dotenv';
dotenv.config();

import { db } from './src/lib/db';
import { clientes, suscripciones } from './src/lib/db/schema';
import { eq, and, exists } from 'drizzle-orm';

async function run() {
  const res = await db.select({
    id: clientes.id,
    nombre: clientes.nombre,
    tieneSuscripcionActiva: exists(
      db.select({ id: suscripciones.id })
        .from(suscripciones)
        .where(
          and(
            eq(suscripciones.clienteId, clientes.id),
            eq(suscripciones.estado, 'activo')
          )
        )
    )
  }).from(clientes).limit(5);
  console.log(res);
  process.exit(0);
}
run();
