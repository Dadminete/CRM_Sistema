const { Client } = require('pg');
require('dotenv').config();

async function simulateInvoicingSearch() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  // Test 1: Search for CLI-2025-0018 (regardless of day)
  const search = "CLI-2025-0018";
  const dia = null; // No day selected
  
  const query = `
    SELECT 
      s.numero_contrato, 
      s.dia_facturacion,
      c.nombre, 
      c.apellidos
    FROM suscripciones s
    INNER JOIN clientes c ON s.cliente_id = c.id
    WHERE 
      ($1::int IS NULL OR s.dia_facturacion = $1)
      AND LOWER(COALESCE(s.estado, '')) = 'activo'
      AND LOWER(COALESCE(c.estado, '')) = 'activo'
      AND (
        $2 = '' OR 
        c.nombre ILIKE $3 OR 
        c.apellidos ILIKE $3 OR 
        c.codigo_cliente ILIKE $3 OR 
        s.numero_contrato ILIKE $3
      )
    LIMIT 10
  `;
  
  console.log(`\nSimulating Invoicing Search for '${search}' (No Day Filter):`);
  const res = await client.query(query, [dia, search, `%${search}%`]);
  console.log(JSON.stringify(res.rows, null, 2));
  
  // Test 2: Search with specific day
  const dia2 = 15;
  console.log(`\nSimulating Invoicing Search for Day ${dia2} (No search term):`);
  const res2 = await client.query(query, [dia2, '', '%%']);
  console.log(`Found ${res2.rows.length} subscriptions for day ${dia2}`);

  await client.end();
}

simulateInvoicingSearch().catch(console.error);
