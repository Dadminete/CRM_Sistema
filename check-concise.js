require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const invoiceNumber = 'FAC-2026-00280';
  
  const r1 = await c.query('SELECT id, numero_factura, estado, total FROM facturas_clientes WHERE numero_factura = $1', [invoiceNumber]);
  if (r1.rows.length === 0) { console.log('Invoice NOT FOUND'); await c.end(); return; }
  
  const f = r1.rows[0];
  console.log(`FACTURA: ${f.numero_factura}, ID: ${f.id}, ESTADO: ${f.estado}, TOTAL: ${f.total}`);

  const r2 = await c.query('SELECT id, monto_pendiente, estado FROM cuentas_por_cobrar WHERE factura_id = $1', [f.id]);
  if (r2.rows.length > 0) {
    const cpc = r2.rows[0];
    console.log(`CPC: ID: ${cpc.id}, MONTO_PENDIENTE: ${cpc.monto_pendiente}, ESTADO: ${cpc.estado}`);
  } else {
    console.log('CPC: NOT FOUND');
  }

  const r3 = await c.query('SELECT id, numero_pago, monto, estado, caja_id FROM pagos_clientes WHERE factura_id = $1', [f.id]);
  console.log(`PAGOS: Found ${r3.rows.length}`);
  r3.rows.forEach(p => console.log(`  PAGO: ${p.numero_pago}, MONTO: ${p.monto}, ESTADO: ${p.estado}, CAJA: ${p.caja_id}`));

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
