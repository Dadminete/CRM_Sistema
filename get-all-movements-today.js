
const { spawn } = require('child_process');
require('dotenv').config();

const psqlPath = "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe";
const localUrl = process.env.LOCAL_DATABASE_URL;
const env = { ...process.env, PGPASSWORD: "Axm0227*" };

const query = `
  SELECT m.id, m.tipo, m.monto, m.descripcion, c.nombre as caja_nombre, m.fecha 
  FROM movimientos_contables m
  LEFT JOIN cajas c ON c.id = m.caja_id
  WHERE m.fecha >= '2026-04-07'
  ORDER BY m.fecha DESC;
`;

const ps = spawn(psqlPath, [localUrl, "-c", query], { env, shell: false });
ps.stdout.on('data', (data) => console.log(`STDOUT: ${data}`));
ps.stderr.on('data', (data) => console.error(`STDERR: ${data}`));
ps.on('close', (code) => console.log(`Finished with code ${code}`));
