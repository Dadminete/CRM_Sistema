/**
 * Script simple para asignar TODOS los permisos existentes al usuario actual
 * Como solución temporal hasta configurar correctamente el sistema de roles
 */

import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const USER_ID = '14794b8f-cd71-4f2b-91c5-eafae9561994';

async function grantAllPermissions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔧 Conectando a la base de datos...');
    const client = await pool.connect();
    
    console.log('📋 Obteniendo todos los permisos existentes...');
    const permisos = await client.query(`
      SELECT id, nombre_permiso, descripcion
      FROM permisos
      WHERE activo = true
      ORDER BY nombre_permiso
    `);
    
    console.log(`✓ Encontrados ${permisos.rowCount} permisos activos`);
    
    console.log('\n📝 Asignando TODOS los permisos al usuario...');
    const result = await client.query(`
      INSERT INTO usuarios_permisos (usuario_id, permiso_id, activo)
      SELECT $1::uuid, p.id, true
      FROM permisos p
      WHERE p.activo = true
      ON CONFLICT (usuario_id, permiso_id) DO UPDATE SET activo = true
      RETURNING *
    `, [USER_ID]);
    
    console.log(`✅ ${result.rowCount} permisos asignados/actualizados`);
    
    // Verificar permisos asignados
    const verify = await client.query(`
      SELECT p.nombre_permiso, p.descripcion, p.categoria
      FROM usuarios_permisos up
      JOIN permisos p ON up.permiso_id = p.id
      WHERE up.usuario_id = $1 AND up.activo = true
      ORDER BY p.categoria, p.nombre_permiso
    `, [USER_ID]);
    
    console.log('\n📋 Permisos actuales del usuario:');
    let currentCategory = '';
    verify.rows.forEach(row => {
      if (row.categoria !== currentCategory) {
        currentCategory = row.categoria;
        console.log(`\n  [${currentCategory.toUpperCase()}]`);
      }
      console.log(`   ✓ ${row.nombre_permiso}`);
    });
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 ¡Listo! El usuario ahora tiene acceso completo al sistema.');
    console.log('Recarga la página del dashboard para aplicar los cambios.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

grantAllPermissions();
