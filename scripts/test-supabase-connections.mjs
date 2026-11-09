import pg from "pg";

const { Client } = pg;
const connections = [
  ["transaction", process.env.SUPABASE_TEST_APP_URL],
  ["session", process.env.SUPABASE_TEST_BACKUP_URL],
];

try {
  for (const [mode, connectionString] of connections) {
    if (!connectionString) {
      throw new Error(`Missing connection string for ${mode} mode.`);
    }

    const client = new Client({ connectionString, connectionTimeoutMillis: 15_000 });
    try {
      await client.connect();
      await client.query("SELECT 1");
      console.log(`Supabase ${mode} connection: OK.`);
    } finally {
      await client.end();
    }
  }
} catch (error) {
  console.error(`Connection test failed (${error.code ?? error.name}): ${error.message}`);
  process.exitCode = 1;
}
