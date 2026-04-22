const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function checkAll() {
  const neon = new Client({ connectionString: process.env.CLOUD_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const local = new Client({ host: '127.0.0.1', port: 5432, user: 'postgres', password: 'Axm0227*', database: 'sistema_v3', ssl: false });

  try {
    await neon.connect();
    await local.connect();

    const tablesRes = await neon.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
    const tables = tablesRes.rows.map(r => r.table_name);

    console.log(`Comprobando ${tables.length} tablas...`);
    let matches = 0;
    let mismatches = [];

    for (const table of tables) {
      try {
        const nRes = await neon.query(`SELECT count(*) FROM "${table}"`);
        const lRes = await local.query(`SELECT count(*) FROM "${table}"`);
        
        if (nRes.rows[0].count === lRes.rows[0].count) {
          matches++;
        } else {
          mismatches.push(`${table}: Neon=${nRes.rows[0].count}, Local=${lRes.rows[0].count}`);
        }
      } catch (e) {
        mismatches.push(`${table}: ERROR (${e.message})`);
      }
    }

    console.log(`--- RESULTADO ---`);
    console.log(`Tablas que coinciden: ${matches}`);
    if (mismatches.length > 0) {
      console.log(`Discrepancias (${mismatches.length}):`);
      mismatches.forEach(m => console.log(` - ${m}`));
    } else {
      console.log(`¡Sincronización perfecta! Todas las tablas coinciden.`);
    }

  } catch (err) {
    console.error('Error general:', err.message);
  } finally {
    await neon.end();
    await local.end();
  }
}

checkAll();
