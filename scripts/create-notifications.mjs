/**
 * Script para crear la tabla de notificaciones
 */

import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function createNotificationsTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔧 Conectando a la base de datos...');
    const client = await pool.connect();
    
    // Verificar si la tabla ya existe
    const exists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notificaciones'
      )
    `);
    
    if (exists.rows[0].exists) {
      console.log('✓ La tabla notificaciones ya existe');
      client.release();
      await pool.end();
      process.exit(0);
      return;
    }
    
    console.log('📝 Creando tabla notificaciones...');
    
    await client.query(`
      CREATE TABLE notificaciones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'FACTURA', 'APROBACION', 'STOCK')),
        titulo VARCHAR(255) NOT NULL,
        mensaje TEXT NOT NULL,
        enlace VARCHAR(255),
        metadata JSONB,
        leida BOOLEAN DEFAULT FALSE NOT NULL,
        fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        fecha_leida TIMESTAMP WITH TIME ZONE
      )
    `);
    
    console.log('✓ Tabla creada');
    
    console.log('📝 Creando índices...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS notificaciones_usuario_id_idx ON notificaciones(usuario_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS notificaciones_leida_idx ON notificaciones(leida)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS notificaciones_fecha_creacion_idx ON notificaciones(fecha_creacion DESC)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS notificaciones_tipo_idx ON notificaciones(tipo)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS notificaciones_usuario_leida_fecha_idx 
        ON notificaciones(usuario_id, leida, fecha_creacion DESC)
    `);
    
    console.log('✓ Índices creados');
    
    console.log('📝 Añadiendo comentarios...');
    
    await client.query(`
      COMMENT ON TABLE notificaciones IS 'Notificaciones del sistema para usuarios'
    `);
    
    await client.query(`
      COMMENT ON COLUMN notificaciones.tipo IS 'Tipo de notificación: INFO, SUCCESS, WARNING, ERROR, FACTURA, APROBACION, STOCK'
    `);
    
    await client.query(`
      COMMENT ON COLUMN notificaciones.metadata IS 'Datos adicionales en formato JSON para contexto de la notificación'
    `);
    
    console.log('✓ Comentarios añadidos');
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 ¡Tabla de notificaciones creada exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createNotificationsTable();
