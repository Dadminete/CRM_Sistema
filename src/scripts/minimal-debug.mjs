import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config();
const sql = postgres(process.env.DATABASE_URL);

async function testEndpoints() {
  console.log('--- TESTING ENDPOINTS ---');
  
  // Test 1: CAJA STATS LOGIC
  try {
      console.log('Testing Caja Stats logic...');
      const [traspasoCat] = await sql`SELECT id FROM categorias_cuentas WHERE codigo = 'TRASP-001' LIMIT 1`;
      const traspasoCatId = traspasoCat?.id || null;
      console.log('   Traspaso Category ID:', traspasoCatId);
      
      const countResult = await sql`SELECT COUNT(*) FROM movimientos_contables`;
      console.log('   Movimientos count:', countResult[0].count);
  } catch (err) {
      console.error('   CAJA STATS ERROR:', err.message);
  }

  // Test 2: NET INCOME LOGIC
  try {
      console.log('\nTesting Net Income logic...');
      const result = await sql`
        SELECT 
            COALESCE(SUM(s.precio_mensual::numeric), 0) as total
        FROM suscripciones s
        INNER JOIN clientes c ON s.cliente_id = c.id
        WHERE LOWER(c.estado) = 'activo' AND LOWER(s.estado) = 'activo'
      `;
      console.log('   Total Net Income:', result[0].total);
  } catch (err) {
      console.error('   NET INCOME ERROR:', err.message);
  }

  await sql.end();
}

testEndpoints();
