// Script para limpiar sesiones y forzar re-login
import pkg from 'pg';
const { Client } = pkg;
import { config } from 'dotenv';
config();

async function clearSessions() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log('✅ Conectado\n');

    // Contar sesiones actuales
    const count = await client.query('SELECT COUNT(*) as total FROM sesiones_usuario WHERE activa = true');
    console.log(`📊 Sesiones activas actuales: ${count.rows[0].total}\n`);

    // Cerrar todas las sesiones activas
    console.log('🔒 Cerrando todas las sesiones activas...');
    const result = await client.query(`
      UPDATE sesiones_usuario 
      SET activa = false
      WHERE activa = true
      RETURNING id
    `);
    
    console.log(`✅ ${result.rowCount} sesiones cerradas`);
    console.log('\n⚠️  Todos los usuarios deben iniciar sesión nuevamente');
    console.log('   Los nuevos tokens incluirán los permisos de planes\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

clearSessions();
