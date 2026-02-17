/**
 * Script simple para asignar permisos de administrador al usuario actual
 * Ejecuta SQL directo sin necesidad de configuración adicional
 */

import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const USER_ID = '14794b8f-cd71-4f2b-91c5-eafae9561994';

async function grantPermissions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔧 Conectando a la base de datos...');
    const client = await pool.connect();
    
    console.log('📝 Creando permiso superadmin...');
    await client.query(`
      INSERT INTO permisos (nombre_permiso, descripcion, categoria, activo, es_sistema, updated_at)
      SELECT 'superadmin', 'Acceso completo a todas las funcionalidades del sistema', 'system', true, true, NOW()
      WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre_permiso = 'superadmin')
    `);
    
    console.log('📝 Creando permisos de base de datos...');
    await client.query(`
      INSERT INTO permisos (nombre_permiso, descripcion, categoria, activo, updated_at)
      SELECT unnest(ARRAY['database:backup', 'database:restore', 'database:view', 'database:manage']),
             unnest(ARRAY[
               'Permite crear respaldos de la base de datos',
               'Permite restaurar respaldos de la base de datos',
               'Permite ver la configuración de la base de datos',
               'Permite administrar la configuración de la base de datos'
             ]),
             'database',
             true,
             NOW()
      WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre_permiso IN ('database:backup', 'database:restore', 'database:view', 'database:manage'))
    `);
    
    console.log('📝 Asignando permisos al usuario...');
    const result = await client.query(`
      INSERT INTO usuarios_permisos (usuario_id, permiso_id, activo)
      SELECT 
        $1::uuid,
        p.id,
        true
      FROM permisos p
      WHERE p.nombre_permiso IN ('superadmin', 'database:backup', 'database:restore', 'database:view', 'database:manage')
      ON CONFLICT (usuario_id, permiso_id) DO UPDATE SET activo = true
      RETURNING *
    `, [USER_ID]);
    
    console.log(`✅ ${result.rowCount} permisos asignados exitosamente`);
    
    // Verificar permisos asignados
    const verify = await client.query(`
      SELECT p.nombre_permiso, p.descripcion
      FROM usuarios_permisos up
      JOIN permisos p ON up.permiso_id = p.id
      WHERE up.usuario_id = $1 AND up.activo = true
      ORDER BY p.nombre_permiso
    `, [USER_ID]);
    
    console.log('\n📋 Permisos actuales del usuario:');
    verify.rows.forEach(row => {
      console.log(`   ✓ ${row.nombre_permiso} - ${row.descripcion}`);
    });
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 ¡Listo! Ahora puedes hacer backups de la base de datos.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

grantPermissions();
