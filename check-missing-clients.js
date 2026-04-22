const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  
  const codes = ['CLI-2025-0018', 'CLI-2025-0008', 'CLI-2025-0003', 'CLI-2025-0019'];
  console.log("--- Checking specific clients ---");
  
  for (const code of codes) {
    const res = await client.query(`
      SELECT c.id, c.nombre, c.apellidos, c.codigo_cliente, c.estado as client_estado, 
             s.id as sub_id, s.estado as sub_estado, s.numero_contrato
      FROM clientes c 
      LEFT JOIN suscripciones s ON c.id = s.cliente_id 
      WHERE c.codigo_cliente = $1
    `, [code]);
    
    console.log(`\nClient Code: ${code}`);
    if (res.rows.length === 0) {
      console.log("NOT FOUND IN DB");
    } else {
      console.log(JSON.stringify(res.rows, null, 2));
    }
  }

  console.log("\n--- Checking total active clients summary ---");
  const stats = await client.query(`
    SELECT 
      (SELECT COUNT(*) FROM clientes) as total_clientes,
      (SELECT COUNT(*) FROM clientes WHERE estado = 'activo') as clientes_activos_table,
      (SELECT COUNT(DISTINCT cliente_id) FROM suscripciones WHERE estado = 'activo') as clientes_con_sub_activa
  `);
  console.log(JSON.stringify(stats.rows[0], null, 2));

  await client.end();
}

run().catch(console.error);
