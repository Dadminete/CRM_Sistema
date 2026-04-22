require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const invoiceNumber = 'FAC-2026-00280';
  
  console.log(`Checking Invoice: ${invoiceNumber}`);
  const q1 = `SELECT * FROM facturas_clientes WHERE numero_factura = $1`;
  const r1 = await c.query(q1, [invoiceNumber]);
  console.log('Invoice:', JSON.stringify(r1.rows, null, 2));

  if (r1.rows.length > 0) {
    const facturaId = r1.rows[0].id;
    const q2 = `SELECT p.*, c.nombre as caja_nombre FROM pagos_clientes p LEFT JOIN cajas c ON c.id = p.caja_id WHERE p.factura_id = $1`;
    const r2 = await c.query(q2, [facturaId]);
    console.log('Payments:', JSON.stringify(r2.rows, null, 2));

    const q3 = `SELECT * FROM cuentas_por_cobrar WHERE factura_id = $1`;
    const r3 = await c.query(q3, [facturaId]);
    console.log('CPC:', JSON.stringify(r3.rows, null, 2));
  }

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
