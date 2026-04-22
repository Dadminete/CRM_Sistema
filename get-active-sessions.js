
const { spawn } = require('child_process');
require('dotenv').config();

const psqlPath = "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe";
const localUrl = process.env.LOCAL_DATABASE_URL;
const env = { ...process.env, PGPASSWORD: "Axm0227*" };

const query = `
  SELECT s.id, s.caja_id, c.nombre as caja_nombre, s.monto_apertura, s.fecha_apertura 
  FROM sesiones_caja s 
  JOIN cajas c ON c.id = s.caja_id 
  WHERE s.estado = 'abierta';
`;

const ps = spawn(psqlPath, [localUrl, "-c", query], { env, shell: false });
ps.stdout.on('data', (data) => console.log(`STDOUT: ${data}`));
ps.stderr.on('data', (data) => console.error(`STDERR: ${data}`));
ps.on('close', (code) => console.log(`Finished with code ${code}`));
