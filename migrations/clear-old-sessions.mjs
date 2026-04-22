/**
 * Script para limpiar sesiones expiradas o inactivas
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function clearOldSessions() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:20050209@localhost:5432/management_studio_db_v6';
  
  const client = new Client({ connectionString });

  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conectado exitosamente\n');

    // Contar sesiones expiradas
    const expiredCount = await client.query(`
      SELECT COUNT(*) as total 
      FROM sesiones_usuario 
      WHERE fecha_expiracion < NOW();
    `);
    
    console.log(`📊 Sesiones expiradas: ${expiredCount.rows[0].total}`);

    // Contar sesiones inactivas
    const inactiveCount = await client.query(`
      SELECT COUNT(*) as total 
      FROM sesiones_usuario 
      WHERE activa = false;
    `);
    
    console.log(`📊 Sesiones inactivas: ${inactiveCount.rows[0].total}`);

    // Eliminar sesiones expiradas
    if (parseInt(expiredCount.rows[0].total) > 0) {
      console.log('\n🗑️  Eliminando sesiones expiradas...');
      const deleteExpired = await client.query(`
        DELETE FROM sesiones_usuario 
        WHERE fecha_expiracion < NOW()
        RETURNING id;
      `);
      console.log(`✅ ${deleteExpired.rowCount} sesiones expiradas eliminadas`);
    }

    // Eliminar sesiones inactivas de más de 7 días
    const deleteInactive = await client.query(`
      DELETE FROM sesiones_usuario 
      WHERE activa = false 
        AND created_at < NOW() - INTERVAL '7 days'
      RETURNING id;
    `);
    
    if (deleteInactive.rowCount > 0) {
      console.log(`✅ ${deleteInactive.rowCount} sesiones inactivas antiguas eliminadas`);
    }

    // Mostrar estado final
    const finalCount = await client.query(`SELECT COUNT(*) as total FROM sesiones_usuario;`);
    console.log(`\n📈 Total de sesiones restantes: ${finalCount.rows[0].total}`);

    // Mostrar sesiones activas por usuario
    const activeSessions = await client.query(`
      SELECT u.username, COUNT(s.id) as sesiones_activas
      FROM sesiones_usuario s
      INNER JOIN usuarios u ON s.usuario_id = u.id
      WHERE s.activa = true AND s.fecha_expiracion > NOW()
      GROUP BY u.username
      ORDER BY sesiones_activas DESC;
    `);

    if (activeSessions.rows.length > 0) {
      console.log('\n👥 Sesiones activas por usuario:');
      console.table(activeSessions.rows);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

clearOldSessions();
