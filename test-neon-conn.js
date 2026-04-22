
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

const psqlPath = "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe";
const cloudUrl = process.env.CLOUD_DATABASE_URL;
const env = { ...process.env, PGPASSWORD: "Axm0227*" };

console.log("Testing connection to Neon Cloud...");
console.log("URL:", cloudUrl);

// Try to run a simple version check without shell: true to avoid '&' escaping issues
const restoreArgs = [cloudUrl, "-c", "SELECT version();"];
const ps = spawn(psqlPath, restoreArgs, { env, shell: false });

ps.stdout.on('data', (data) => console.log(`STDOUT: ${data}`));
ps.stderr.on('data', (data) => console.error(`STDERR: ${data}`));

ps.on('close', (code) => {
  console.log(`Finished with code ${code}`);
});
