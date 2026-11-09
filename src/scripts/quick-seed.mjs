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
    const users = await client.query("SELECT id FROM usuarios LIMIT 1");
    let userId;
    if (users.rows.length > 0) {
      userId = users.rows[0].id;
    } else {
      const newUser = await client.query(`
        INSERT INTO usuarios (nombre, email, password, rol, estado, updated_at)
        VALUES ('Admin', 'admin@sys.com', 'hash', 'admin', 'activo', now())
        RETURNING id
      `);
      if (!newUser.rows[0]) {
        throw new Error("The user insert did not return an ID");
      }
      userId = newUser.rows[0].id;
    }
    fs.writeFileSync("user_id.txt", String(userId));
    console.log("Written to user_id.txt");
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
