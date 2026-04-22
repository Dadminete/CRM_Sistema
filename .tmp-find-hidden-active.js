require('dotenv').config();
const { Client } = require('pg');
(async()=>{
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const q = `
    SELECT s.dia_facturacion,
           COUNT(*) AS total_ocultos
    FROM suscripciones s
    INNER JOIN clientes c ON c.id = s.cliente_id
    WHERE LOWER(COALESCE(s.estado,'')) = 'activo'
      AND LOWER(COALESCE(c.estado,'')) = 'activo'
      AND c.estado <> 'activo'
    GROUP BY s.dia_facturacion
    ORDER BY s.dia_facturacion;
  `;
  const q2 = `
    SELECT c.id, c.nombre, c.apellidos, c.estado, s.id as suscripcion_id, s.dia_facturacion, s.estado as suscripcion_estado
    FROM suscripciones s
    INNER JOIN clientes c ON c.id = s.cliente_id
    WHERE LOWER(COALESCE(s.estado,''))='activo'
      AND LOWER(COALESCE(c.estado,''))='activo'
      AND c.estado <> 'activo'
    ORDER BY s.dia_facturacion, c.nombre, c.apellidos
    LIMIT 300;
  `;
  const r = await c.query(q);
  const r2 = await c.query(q2);
  console.log(JSON.stringify({porDia:r.rows, total:r2.rows.length, muestra:r2.rows.slice(0,30)},null,2));
  await c.end();
})().catch(e=>{console.error(e);process.exit(1);});
