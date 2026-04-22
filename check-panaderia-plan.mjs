// Script para verificar si existe el Plan 5MB Panaderia
import pkg from 'pg';
const { Client } = pkg;
import { config } from 'dotenv';
config();

async function checkPanaderiaPlans() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Buscar planes que contengan "Panaderia" o "5MB" o "5 MB"
    const searchResult = await client.query(`
      SELECT 
        p.id, 
        p.nombre, 
        p.descripcion,
        c.nombre as categoria_nombre,
        p.precio, 
        p.moneda,
        p.bajada_mbps,
        p.subida_kbps,
        p.activo,
        p.orden
      FROM planes p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE 
        LOWER(p.nombre) LIKE '%panaderia%' OR
        LOWER(p.nombre) LIKE '%5mb%' OR
        LOWER(p.nombre) LIKE '%5 mb%' OR
        LOWER(p.descripcion) LIKE '%panaderia%' OR
        p.bajada_mbps = 5
      ORDER BY p.orden, p.id
    `);

    if (searchResult.rows.length > 0) {
      console.log(`✅ Encontrados ${searchResult.rows.length} plan(es) relacionado(s):\n`);
      console.table(searchResult.rows);
    } else {
      console.log('⚠️  No se encontró ningún plan con "Panaderia" o "5MB"');
      
      // Mostrar todos los planes existentes
      const allPlans = await client.query(`
        SELECT 
          p.id, 
          p.nombre, 
          c.nombre as categoria,
          p.bajada_mbps as bajada_mb,
          p.precio,
          p.activo
        FROM planes p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        ORDER BY p.orden, p.id
        LIMIT 10
      `);
      
      if (allPlans.rows.length > 0) {
        console.log('\n📋 Planes existentes en la base de datos:');
        console.table(allPlans.rows);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

checkPanaderiaPlans();
