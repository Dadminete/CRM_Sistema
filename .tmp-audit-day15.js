require('dotenv').config();
const { Client } = require('pg');
(async()=>{
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const q1 = `
    SELECT c.id, c.nombre, c.apellidos, c.estado as cliente_estado,
           s.id as suscripcion_id, s.estado as suscripcion_estado, s.dia_facturacion,
           s.precio_mensual, s.numero_contrato, s.servicio_id, s.plan_id,
           srv.nombre as servicio_nombre, p.nombre as plan_nombre
    FROM clientes c
    LEFT JOIN suscripciones s ON s.cliente_id = c.id
    LEFT JOIN servicios srv ON srv.id = s.servicio_id
    LEFT JOIN planes p ON p.id = s.plan_id
    WHERE LOWER(c.nombre || ' ' || c.apellidos) LIKE LOWER('%yokabel%gil%')
       OR LOWER(c.nombre || ' ' || c.apellidos) LIKE LOWER('%yokabel%')
       OR LOWER(c.nombre || ' ' || c.apellidos) LIKE LOWER('%gil%')
    ORDER BY c.nombre, c.apellidos, s.created_at DESC NULLS LAST;
  `;
  const r1 = await c.query(q1);
  const q2 = `
    SELECT s.id, s.cliente_id, c.nombre, c.apellidos, c.estado as cliente_estado,
           s.estado as suscripcion_estado, s.dia_facturacion, s.precio_mensual, s.numero_contrato
    FROM suscripciones s
    INNER JOIN clientes c ON c.id = s.cliente_id
    WHERE s.dia_facturacion = 15 AND c.estado = 'activo' AND (s.estado IS DISTINCT FROM 'activo')
    ORDER BY c.nombre, c.apellidos
    LIMIT 200;
  `;
  const r2 = await c.query(q2);
  console.log(JSON.stringify({yokabel:r1.rows, day15_client_active_but_sub_not_active:r2.rows, count_issue:r2.rows.length},null,2));
  await c.end();
})().catch(e=>{console.error(e);process.exit(1);});
