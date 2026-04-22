require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  // Cases that old strict filter would miss in /suscripciones/por-dia-facturacion
  const summaryQ = `
    SELECT
      s.dia_facturacion,
      COUNT(*) FILTER (WHERE LOWER(COALESCE(s.estado,''))='activo' AND s.estado <> 'activo') AS sub_estado_case_mismatch,
      COUNT(*) FILTER (WHERE LOWER(COALESCE(c.estado,''))='activo' AND c.estado <> 'activo') AS cli_estado_case_mismatch,
      COUNT(*) FILTER (
        WHERE LOWER(COALESCE(s.estado,''))='activo'
          AND LOWER(COALESCE(c.estado,''))='activo'
          AND (s.estado <> 'activo' OR c.estado <> 'activo')
      ) AS ocultos_por_filtro_estricto
    FROM suscripciones s
    INNER JOIN clientes c ON c.id = s.cliente_id
    GROUP BY s.dia_facturacion
    ORDER BY s.dia_facturacion;
  `;

  const detailQ = `
    SELECT
      s.dia_facturacion,
      c.id AS cliente_id,
      c.nombre,
      c.apellidos,
      c.estado AS cliente_estado,
      s.id AS suscripcion_id,
      s.estado AS suscripcion_estado,
      s.numero_contrato
    FROM suscripciones s
    INNER JOIN clientes c ON c.id = s.cliente_id
    WHERE LOWER(COALESCE(s.estado,''))='activo'
      AND LOWER(COALESCE(c.estado,''))='activo'
      AND (s.estado <> 'activo' OR c.estado <> 'activo')
    ORDER BY s.dia_facturacion, c.nombre, c.apellidos
    LIMIT 500;
  `;

  const [summary, detail] = await Promise.all([
    c.query(summaryQ),
    c.query(detailQ),
  ]);

  const affectedDays = summary.rows
    .filter(r => Number(r.ocultos_por_filtro_estricto) > 0)
    .map(r => ({
      dia_facturacion: Number(r.dia_facturacion),
      ocultos_por_filtro_estricto: Number(r.ocultos_por_filtro_estricto),
      sub_estado_case_mismatch: Number(r.sub_estado_case_mismatch),
      cli_estado_case_mismatch: Number(r.cli_estado_case_mismatch),
    }));

  console.log(JSON.stringify({
    total_registros_con_riesgo: detail.rows.length,
    dias_afectados: affectedDays,
    muestra: detail.rows.slice(0, 50)
  }, null, 2));

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
