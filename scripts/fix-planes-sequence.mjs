// Script para resetear la secuencia de IDs de la tabla planes
import pkg from 'pg';
const { Client } = pkg;
import { config } from 'dotenv';
config();

async function resetPlanesSequence() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Obtener el ID máximo actual
    const maxResult = await client.query('SELECT MAX(id) as max_id FROM planes');
    const maxId = maxResult.rows[0].max_id || 0;
    console.log(`📊 ID máximo actual en tabla planes: ${maxId}`);

    // Obtener el nombre de la secuencia
    const seqResult = await client.query(`
      SELECT pg_get_serial_sequence('planes', 'id') as sequence_name
    `);
    const sequenceName = seqResult.rows[0].sequence_name;
    console.log(`🔢 Nombre de la secuencia: ${sequenceName}`);

    if (!sequenceName) {
      console.log('❌ No se encontró secuencia para la columna id');
      return;
    }

    // Obtener el valor actual de la secuencia
    const currentResult = await client.query(`SELECT last_value FROM ${sequenceName}`);
    const currentValue = currentResult.rows[0].last_value;
    console.log(`📍 Valor actual de la secuencia: ${currentValue}`);

    // Resetear la secuencia al valor máximo + 1
    const newValue = parseInt(maxId) + 1;
    await client.query(`SELECT setval('${sequenceName}', ${newValue}, false)`);
    
    console.log(`\n✅ Secuencia reseteada exitosamente a: ${newValue}`);
    console.log('   El próximo INSERT usará el ID:', newValue);

    // Verificar
    const verifyResult = await client.query(`SELECT last_value FROM ${sequenceName}`);
    console.log(`🔍 Verificación - Nuevo valor de secuencia: ${verifyResult.rows[0].last_value}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

resetPlanesSequence();
