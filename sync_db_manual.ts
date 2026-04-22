import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function sync() {
  try {
    console.log('Creating table historial_suscripciones...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS historial_suscripciones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        suscripcion_id UUID NOT NULL REFERENCES suscripciones(id) ON DELETE CASCADE,
        usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        tipo_cambio VARCHAR(50) NOT NULL,
        valor_anterior TEXT,
        valor_nuevo TEXT,
        fecha TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    
    console.log('Creating index...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS historial_suscripciones_suscripcion_id_idx ON historial_suscripciones (suscripcion_id)
    `);
    
    console.log('SUCCESS: Table and index ensured.');
  } catch (e: any) {
    console.error('FAILURE: ' + e.message);
    process.exit(1);
  }
}

sync().then(() => process.exit(0));
