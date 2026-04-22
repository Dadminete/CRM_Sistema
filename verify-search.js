const { Client } = require('pg');
require('dotenv').config();

async function simulateApiQuery() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const searchTerms = ["CLI-2025-0018", "CLI-2025-0003", "CLI-2025-0008"];
  
  for (const search of searchTerms) {
    const query = `
      SELECT c.codigo_cliente, c.nombre, c.estado 
      FROM clientes c 
      WHERE c.nombre ILIKE $1 OR c.apellidos ILIKE $1 OR c.codigo_cliente ILIKE $1
      LIMIT 10
    `;
    const res = await client.query(query, [`%${search}%`]);
    console.log(`\nSimulated API Result for Search '${search}':`);
    if (res.rows.length === 0) {
      console.log("NOT FOUND");
    } else {
      console.log(JSON.stringify(res.rows, null, 2));
    }
  }
  
  await client.end();
}

simulateApiQuery().catch(console.error);
