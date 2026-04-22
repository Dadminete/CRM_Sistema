import { db } from './src/lib/db';
import { pagosClientes, usuarios } from './src/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

async function main() {
  const pagos = await db.select({
    facturaId: pagosClientes.facturaId,
    monto: pagosClientes.monto,
    createdAt: pagosClientes.createdAt,
    recibidoPor: pagosClientes.recibidoPor,
    usuario: usuarios.nombre,
    apellido: usuarios.apellido,
    username: usuarios.username
  })
  .from(pagosClientes)
  .leftJoin(usuarios, eq(pagosClientes.recibidoPor, usuarios.id))
  .orderBy(desc(pagosClientes.createdAt))
  .limit(10);
  
  console.log(pagos);
  process.exit(0);
}

main();
