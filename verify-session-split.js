
const { spawn } = require('child_process');
require('dotenv').config();

const psqlPath = "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe";
const localUrl = process.env.LOCAL_DATABASE_URL;
const env = { ...process.env, PGPASSWORD: "Axm0227*" };

const query = `
  WITH sesion AS (
    SELECT id, caja_id, fecha_apertura 
    FROM sesiones_caja 
    WHERE id = 'c523b1a6-3c5f-47cd-adf8-356a77e78cea'
  )
  SELECT 
    (SELECT COALESCE(SUM(monto), 0) FROM movimientos_contables WHERE caja_id = sesion.caja_id AND fecha >= sesion.fecha_apertura AND tipo IN ('ingreso', 'traspaso') AND categoria_id != '6e95d1f6-bec7-464e-b18c-3d32be9a7df9') as ingresos_normes,
    (SELECT COALESCE(SUM(monto), 0) FROM movimientos_contables WHERE caja_id = sesion.caja_id AND fecha >= sesion.fecha_apertura AND tipo IN ('gasto', 'egreso') AND categoria_id != '6e95d1f6-bec7-464e-b18c-3d32be9a7df9') as gastos_normes,
    (SELECT COALESCE(SUM(monto), 0) FROM movimientos_contables WHERE caja_id = sesion.caja_id AND fecha >= sesion.fecha_apertura AND tipo IN ('ingreso', 'traspaso') AND categoria_id = '6e95d1f6-bec7-464e-b18c-3d32be9a7df9') as traspasos_in,
    (SELECT COALESCE(SUM(monto), 0) FROM movimientos_contables WHERE caja_id = sesion.caja_id AND fecha >= sesion.fecha_apertura AND tipo IN ('gasto', 'egreso') AND categoria_id = '6e95d1f6-bec7-464e-b18c-3d32be9a7df9') as traspasos_out
  FROM sesion;
`;

const ps = spawn(psqlPath, [localUrl, "-c", query], { env, shell: false });
ps.stdout.on('data', (data) => console.log(`STDOUT: ${data}`));
ps.on('close', (code) => console.log(`Finished with code ${code}`));
