
const { spawn } = require('child_process');
require('dotenv').config();

const psqlPath = "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe";
const localUrl = process.env.LOCAL_DATABASE_URL;
const env = { ...process.env, PGPASSWORD: "Axm0227*" };

const query = `
  SELECT * FROM traspasos 
  ORDER BY created_at DESC 
  LIMIT 5;
`;

const ps = spawn(psqlPath, [localUrl, "-c", query], { env, shell: false });
ps.stdout.on('data', (data) => console.log(`STDOUT: ${data}`));
ps.stderr.on('data', (data) => console.error(`STDERR: ${data}`));
ps.on('close', (code) => console.log(`Finished with code ${code}`));
