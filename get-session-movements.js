
const { spawn } = require('child_process');
require('dotenv').config();

const psqlPath = "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe";
const localUrl = process.env.LOCAL_DATABASE_URL;
const env = { ...process.env, PGPASSWORD: "Axm0227*" };

const sessionId = "c523b1a6-3c5f-47cd-adf8-356a77e78cea";
const cajaId = "c5ab2edc-d32c-494d-b454-d1731c6c31df";
const fechaApertura = "2026-04-06 10:49:08";

const query = `
  SELECT id, tipo, monto, descripcion, fecha 
  FROM movimientos_contables 
  WHERE caja_id = '${cajaId}' 
    AND fecha >= '${fechaApertura}'
  ORDER BY fecha ASC;
`;

const ps = spawn(psqlPath, [localUrl, "-c", query], { env, shell: false });
ps.stdout.on('data', (data) => console.log(`STDOUT: ${data}`));
ps.stderr.on('data', (data) => console.error(`STDERR: ${data}`));
ps.on('close', (code) => console.log(`Finished with code ${code}`));
