// Script para verificar datos en la tabla planes
import pkg from 'pg';
const { Client } = pkg;
import { config } from 'dotenv';
config();

async function checkPlanes() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Verificar cantidad de planes
    const countResult = await client.query('SELECT COUNT(*) as total FROM planes');
    console.log(`📊 Total de planes en BD: ${countResult.rows[0].total}\n`);

    // Obtener primeros 5 planes
    const planesResult = await client.query(`
      SELECT 
        p.id, 
        p.nombre, 
        p.categoria_id,
        c.nombre as categoria_nombre,
        p.precio, 
        p.moneda,
        p.bajada_mbps,
        p.subida_kbps,
        p.activo 
      FROM planes p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      ORDER BY p.orden, p.id 
      LIMIT 5
    `);

    if (planesResult.rows.length > 0) {
      console.log('📋 Primeros planes en la BD:');
      console.table(planesResult.rows);
    } else {
      console.log('⚠️  No hay planes en la base de datos');
    }

    // Verificar categorias
    const catResult = await client.query('SELECT COUNT(*) as total FROM categorias WHERE activo = true');
    console.log(`\n📁 Categorías activas: ${catResult.rows[0].total}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkPlanes();
