
const { spawn } = require('child_process');
require('dotenv').config();

const psqlPath = "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe";
const cloudUrl = process.env.CLOUD_DATABASE_URL;
const env = { ...process.env, PGPASSWORD: "Axm0227*" };

// Check constraints on 'usuarios' in Cloud
const query = `
  SELECT conname, contype, pg_get_constraintdef(c.oid) 
  FROM pg_constraint c 
  JOIN pg_class t ON t.oid = c.conrelid 
  WHERE t.relname = 'usuarios';
`;

const ps = spawn(psqlPath, [cloudUrl, "-c", query], { env, shell: false });
ps.stdout.on('data', (data) => console.log(`STDOUT: ${data}`));
ps.stderr.on('data', (data) => console.error(`STDERR: ${data}`));
ps.on('close', (code) => console.log(`Finished with code ${code}`));
