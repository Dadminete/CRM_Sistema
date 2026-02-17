import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function main() {
  try {
    const sessions = await sql`SELECT * FROM sesiones_caja ORDER BY created_at DESC LIMIT 5`;
    fs.writeFileSync("sessions-debug.json", JSON.stringify(sessions, null, 2));
    console.log("Sessions written to sessions-debug.json");
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
