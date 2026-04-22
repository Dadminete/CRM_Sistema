const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  const client = new Client({
    connectionString: process.env.CLOUD_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('--- NEON CLOUD STATUS ---');
    const tables = ['usuarios', 'clientes', 'facturas_clientes', 'pagos_clientes'];
    for (const table of tables) {
      const res = await client.query(`SELECT count(*) FROM "${table}"`);
      console.log(`${table}: ${res.rows[0].count}`);
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await client.end();
  }

  // Local Check
  const localClient = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'Axm0227*',
    database: 'sistema_v3',
    ssl: false
  });

  try {
    await localClient.connect();
    console.log('--- LOCAL STATUS ---');
    const tables = ['usuarios', 'clientes', 'facturas_clientes', 'pagos_clientes'];
    for (const table of tables) {
      const res = await localClient.query(`SELECT count(*) FROM "${table}"`);
      console.log(`${table}: ${res.rows[0].count}`);
    }
  } catch (err) {
    console.error('ERROR LOCAL:', err.message);
  } finally {
    await localClient.end();
  }
}

check();
