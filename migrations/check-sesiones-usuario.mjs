/**
 * Script para verificar la tabla sesiones_usuario y ejecutar una consulta de prueba
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function checkTable() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:20050209@localhost:5432/management_studio_db_v6';
  
  const client = new Client({ connectionString });

  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conectado exitosamente\n');

    // Verificar estructura de la tabla
    console.log('📊 Estructura de la tabla sesiones_usuario:');
    const structure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'sesiones_usuario' 
      ORDER BY ordinal_position;
    `);

    console.table(structure.rows);

    // Contar registros
    const count = await client.query(`SELECT COUNT(*) as total FROM sesiones_usuario;`);
    console.log(`\n📈 Total de sesiones: ${count.rows[0].total}`);

    // Intentar la misma consulta que falla en auth.ts
    console.log('\n🔍 Probando consulta similar a auth.ts:');
    const testQuery = await client.query(`
      SELECT id, usuario_id, token_hash, ip_address, user_agent, activa, 
             fecha_inicio, fecha_ultimo_uso, fecha_expiracion, created_at
      FROM sesiones_usuario
      WHERE id = $1 AND activa = $2
      LIMIT $3
    `, ['c4297e0b-d472-476d-b888-db84ef7cb610', true, 1]);

    console.log(`Registros encontrados: ${testQuery.rows.length}`);
    if (testQuery.rows.length > 0) {
      console.table(testQuery.rows);
    } else {
      console.log('⚠️  No se encontró ninguna sesión con ese ID');
    }

    // Listar algunas sesiones activas
    console.log('\n📋 Últimas 5 sesiones:');
    const sessions = await client.query(`
      SELECT id, usuario_id, activa, fecha_inicio, fecha_expiracion
      FROM sesiones_usuario
      ORDER BY fecha_inicio DESC
      LIMIT 5;
    `);

    if (sessions.rows.length > 0) {
      console.table(sessions.rows);
    } else {
      console.log('⚠️  No hay sesiones en la tabla');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

checkTable();
