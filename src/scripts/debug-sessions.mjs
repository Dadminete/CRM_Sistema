import dotenv from "dotenv";
import fs from "fs";
import pg from "pg";

dotenv.config();

const { Client } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be configured");
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    const sessions = await client.query("SELECT * FROM sesiones_caja ORDER BY created_at DESC LIMIT 5");
    fs.writeFileSync("sessions-debug.json", JSON.stringify(sessions.rows, null, 2));
    console.log("Sessions written to sessions-debug.json");
  } catch (error) {
    console.error("Error:", error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});
