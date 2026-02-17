import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function main() {
  try {
    const users = await sql`SELECT id FROM usuarios LIMIT 1`;
    let userId;
    if (users.length > 0) {
      userId = users[0].id;
    } else {
      const newUser = await sql`
        INSERT INTO usuarios (nombre, email, password, rol, estado, updated_at)
        VALUES ('Admin', 'admin@sys.com', 'hash', 'admin', 'activo', now())
        RETURNING id
      `;
      userId = newUser[0].id;
    }
    fs.writeFileSync("user_id.txt", userId);
    console.log("Written to user_id.txt");
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
