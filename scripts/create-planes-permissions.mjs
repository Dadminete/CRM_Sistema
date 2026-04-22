// Script simple para crear permisos de planes
// Ejecutar con: node scripts/create-planes-permissions.mjs

import pkg from 'pg';
const { Client } = pkg;

// Leer variables de entorno del archivo .env
import { config } from 'dotenv';
config();

async function createPermissions() {
  console.log('🔌 Conectando a la base de datos...\n');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado\n');

    // Permisos a crear
    const permissions = [
      { name: 'planes:leer', description: 'Ver y listar planes de internet' },
      { name: 'planes:crear', description: 'Crear nuevos planes de internet' },
      { name: 'planes:editar', description: 'Editar planes de internet existentes' },
      { name: 'planes:eliminar', description: 'Eliminar planes de internet' },
    ];

    console.log('🚀 Creando permisos...\n');

    for (const perm of permissions) {
      // Verificar si existe
      const checkQuery = 'SELECT id, nombre_permiso FROM permisos WHERE nombre_permiso = $1';
      const checkResult = await client.query(checkQuery, [perm.name]);

      if (checkResult.rows.length > 0) {
        console.log(`⏭️  ${perm.name} - Ya existe (ID: ${checkResult.rows[0].id})`);
        continue;
      }

      // Crear el permiso
      const insertQuery = `
        INSERT INTO permisos (nombre_permiso, descripcion, activo, es_sistema, created_at, updated_at) 
        VALUES ($1, $2, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
        RETURNING id, nombre_permiso
      `;
      const insertResult = await client.query(insertQuery, [perm.name, perm.description]);
      
      console.log(`✅ ${perm.name} - Creado (ID: ${insertResult.rows[0].id})`);
    }

    console.log('\n📊 Verificando permisos creados:\n');
    
    const verifyQuery = `
      SELECT id, nombre_permiso, descripcion, activo 
      FROM permisos 
      WHERE nombre_permiso LIKE 'planes:%' 
      ORDER BY nombre_permiso
    `;
    const verifyResult = await client.query(verifyQuery);
    
    console.table(verifyResult.rows);

    console.log('\n⚠️  IMPORTANTE: Debes asignar estos permisos a tu rol de usuario');
    console.log('   Opción 1: Ve a http://172.16.0.25:3000/dashboard/roles');
    console.log('   Opción 2: Ejecuta el siguiente Query en tu base de datos:\n');
    
    // Obtener rol de admin
    const roleQuery = "SELECT id, nombre_rol FROM roles WHERE nombre_rol ILIKE '%admin%' LIMIT 1";
    const roleResult = await client.query(roleQuery);
    
    if (roleResult.rows.length > 0) {
      const adminRole = roleResult.rows[0];
      console.log(`   -- Asignar permisos al rol: ${adminRole.nombre_rol} (${adminRole.id})`);
      console.log(`   INSERT INTO roles_permisos (rol_id, permiso_id, activo)`);
      console.log(`   SELECT '${adminRole.id}'::uuid, p.id, true`);
      console.log(`   FROM permisos p WHERE p.nombre_permiso LIKE 'planes:%'`);
      console.log(`   ON CONFLICT (rol_id, permiso_id) DO UPDATE SET activo = true;`);
      
      // Auto asignar
      console.log('\n🔧 Auto-asignando permisos al rol Admin...');
      const assignQuery = `
        INSERT INTO roles_permisos (rol_id, permiso_id, activo, fecha_asignacion)
        SELECT $1::bigint, p.id::bigint, true, CURRENT_TIMESTAMP
        FROM permisos p WHERE p.nombre_permiso LIKE 'planes:%'
        ON CONFLICT (rol_id, permiso_id) DO UPDATE SET activo = true
      `;
      await client.query(assignQuery, [adminRole.id]);
      console.log(`✅ Permisos asignados al rol ${adminRole.nombre_rol}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🎉 Proceso completado');
  }
}

createPermissions();
