// Verificar usuario y sus permisos
import pkg from 'pg';
const { Client } = pkg;
import { config } from 'dotenv';
config();

async function checkUserPermissions() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log('✅ Conectado\n');

    // Obtener usuarios activos
    const users = await client.query(`
      SELECT id, username, nombre, apellido, activo 
      FROM usuarios 
      WHERE activo = true 
      ORDER BY username
      LIMIT 5
    `);
    
    console.log('👥 Usuarios activos:');
    console.table(users.rows);

    // Para cada usuario, ver sus roles y permisos de planes
    for (const user of users.rows) {
      console.log(`\n🔍 Verificando permisos de: ${user.username} (${user.nombre} ${user.apellido})`);
      
      // Roles del usuario
      const userRoles = await client.query(`
        SELECT r.id, r.nombre_rol 
        FROM usuarios_roles ur
        JOIN roles r ON ur.rol_id = r.id
        WHERE ur.usuario_id = $1 AND ur.activo = true
      `, [user.id]);
      
      console.log(`   Roles (${userRoles.rows.length}):`, userRoles.rows.map(r => r.nombre_rol).join(', ') || 'Sin roles');
      
      // Permisos de planes para este usuario (via roles)
      const planesPerms = await client.query(`
        SELECT DISTINCT p.nombre_permiso
        FROM usuarios_roles ur
        JOIN roles_permisos rp ON ur.rol_id = rp.rol_id AND rp.activo = true
        JOIN permisos p ON rp.permiso_id = p.id AND p.activo = true
        WHERE ur.usuario_id = $1 
          AND ur.activo = true
          AND p.nombre_permiso LIKE 'planes:%'
        ORDER BY p.nombre_permiso
      `, [user.id]);
      
      if (planesPerms.rows.length > 0) {
        console.log(`   ✅ Permisos de planes (${planesPerms.rows.length}):`, planesPerms.rows.map(p => p.nombre_permiso).join(', '));
      } else {
        console.log(`   ❌ Sin permisos de planes`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkUserPermissions();
