require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const q = `
    SELECT p.id,p.numero_pago,p.factura_id,p.cliente_id,p.monto,p.descuento,p.metodo_pago,p.caja_id,p.cuenta_bancaria_id,p.fecha_pago,p.created_at,p.estado,
           f.numero_factura, f.estado as factura_estado, cxc.monto_pendiente
    FROM pagos_clientes p
    LEFT JOIN facturas_clientes f ON f.id=p.factura_id
    LEFT JOIN cuentas_por_cobrar cxc ON cxc.factura_id=p.factura_id
    WHERE p.monto='1400.00' OR p.monto='1400'
    ORDER BY p.created_at DESC
    LIMIT 15
  `;
  const r = await c.query(q);
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
