require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const payment = await c.query(`
    SELECT id, numero_pago, factura_id, monto, descuento, created_at, estado
    FROM pagos_clientes
    WHERE numero_pago = 'PAG-2039'
       OR id = '711f2b83-2b05-4afd-b0b4-8df12d33ae13'
  `);

  const factura = await c.query(`
    SELECT f.id, f.numero_factura, f.estado, f.descuento,
           cxc.monto_original, cxc.monto_pendiente, cxc.estado as cxc_estado
    FROM facturas_clientes f
    LEFT JOIN cuentas_por_cobrar cxc ON cxc.factura_id = f.id
    WHERE f.id = '9da5d9e4-9714-46c8-8b31-6ebec58ae122'
       OR f.numero_factura = 'FAC-2026-00282'
  `);

  const mov = await c.query(`
    SELECT id, tipo, monto, descripcion, fecha
    FROM movimientos_contables
    WHERE descripcion LIKE 'Pago de factura PAG-2039%'
    ORDER BY fecha DESC
  `);

  console.log(JSON.stringify({
    pago2039: payment.rows,
    factura282: factura.rows,
    movimientosPago2039: mov.rows,
  }, null, 2));

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
