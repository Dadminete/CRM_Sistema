import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);

async function debug() {
  try {
    const clientName = 'Angel Miguel Pedro%';
    
    console.log(`Searching for client: ${clientName}`);
    const matchedClients = await sql`
      SELECT id, nombre, apellidos FROM clientes 
      WHERE (nombre || ' ' || apellidos) ILIKE ${clientName}
    `;
    
    console.log(`Found ${matchedClients.length} matched clients`);
    matchedClients.forEach(c => console.log(`Client: ${c.id}, Name: ${c.nombre} ${c.apellidos}`));

    if (matchedClients.length === 0) return;

    const clientIds = matchedClients.map(c => c.id);

    console.log('\n--- Recent Payments for these clients ---');
    const payments = await sql`
      SELECT p.*, c.nombre as caja_nombre, cl.nombre as client_name
      FROM pagos_clientes p
      LEFT JOIN cajas c ON p.caja_id = c.id
      LEFT JOIN clientes cl ON p.cliente_id = cl.id
      WHERE p.cliente_id IN ${sql(clientIds)}
      ORDER BY p.fecha_pago DESC
      LIMIT 10
    `;

    payments.forEach(p => {
      console.log(`Date: ${p.fecha_pago}, Amount: ${p.monto}, Status: ${p.estado}, Caja: ${p.caja_nombre}, Inv: ${p.factura_id}`);
    });

    console.log('\n--- ALL Payments Today ---');
    const today = '2026-03-24';
    const allToday = await sql`
      SELECT p.*, c.nombre as caja_nombre, cl.nombre as client_name, cl.apellidos as client_lastname
      FROM pagos_clientes p
      LEFT JOIN cajas c ON p.caja_id = c.id
      LEFT JOIN clientes cl ON p.cliente_id = cl.id
      WHERE p.fecha_pago = ${today}
    `;
    allToday.forEach(p => {
      console.log(`Time: ${p.created_at}, Client: ${p.client_name} ${p.client_lastname}, Amount: ${p.monto}, Caja: ${p.caja_nombre}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

debug();
