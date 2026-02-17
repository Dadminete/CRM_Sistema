import { Pool } from "pg";

const connectionString =
  "postgresql://neondb_owner:npg_KC1FGXmnIbw7@ep-withered-term-ah5smbej-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require";

if (!connectionString) {
  console.error("DATABASE_URL is not defined");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: true,
});

async function main() {
  console.log("--- DEBUGGING CASH BOX BALANCE (DIRECT PG) ---");

  try {
    // 1. Get the latest active session
    const sessionRes = await pool.query(`
            SELECT * FROM sesiones_caja 
            WHERE estado = 'abierta' 
            ORDER BY fecha_apertura DESC 
            LIMIT 1
        `);

    if (sessionRes.rows.length === 0) {
      console.log("No active session found.");
      return;
    }

    const session = sessionRes.rows[0];
    console.log("Active Session:", {
      id: session.id,
      cajaId: session.caja_id,
      fechaApertura: session.fecha_apertura,
      usuarioId: session.usuario_id,
    });

    // 2. Query LAST 5 movements globally to see what's happening
    const recentMovementsRes = await pool.query(`
            SELECT * FROM movimientos_contables 
            ORDER BY fecha DESC 
            LIMIT 5
        `);

    const output = `
Active Session:
ID: ${session.id}
Caja ID: ${session.caja_id}
Fecha Apertura: ${session.fecha_apertura}
Usuario ID: ${session.usuario_id}

--- RECENT MOVEMENTS (GLOBAL) ---
${recentMovementsRes.rows
  .map(
    (m) => `
ID: ${m.id}
Tipo: ${m.tipo}
Monto: ${m.monto}
Caja ID: ${m.caja_id}
Fecha: ${m.fecha}
Metodo: ${m.metodo}
Usuario: ${m.usuario_id}
Matches Session Caja? ${m.caja_id === session.caja_id ? "YES" : "NO"}
After Opening? ${new Date(m.fecha) >= new Date(session.fecha_apertura) ? "YES" : "NO"}
`,
  )
  .join("\n")}
        `;

    console.log(output);
    const fs = require("fs");
    fs.writeFileSync("debug-output.txt", output, "utf8");
  } catch (err: any) {
    console.error("Error executing query", err);
    const fs = require("fs");
    fs.writeFileSync("debug-output.txt", `ERROR:\n${err.message}\n${JSON.stringify(err, null, 2)}`, "utf8");
  } finally {
    await pool.end();
  }
}

main();
