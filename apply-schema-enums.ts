import { Client } from 'pg';
import "dotenv/config"; // load env

async function runSQL() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    console.log("Altering columns to use ENUM types...");

    await client.query(`
      ALTER TABLE movimientos_inventario ALTER COLUMN tipo_movimiento DROP DEFAULT;
      ALTER TABLE movimientos_inventario 
      ALTER COLUMN tipo_movimiento TYPE "TipoMovimientoInventario" 
      USING upper(tipo_movimiento::text)::"TipoMovimientoInventario";
    `);

    await client.query(`
      ALTER TABLE ventas_papeleria ALTER COLUMN metodo_pago DROP DEFAULT;
      ALTER TABLE ventas_papeleria ALTER COLUMN estado DROP DEFAULT;

      ALTER TABLE ventas_papeleria 
      ALTER COLUMN metodo_pago TYPE "MetodoPagoPapeleria" 
      USING upper(metodo_pago::text)::"MetodoPagoPapeleria",
      ALTER COLUMN estado TYPE "EstadoVentaPapeleria"
      USING upper(estado::text)::"EstadoVentaPapeleria";

      ALTER TABLE ventas_papeleria ALTER COLUMN metodo_pago SET DEFAULT 'EFECTIVO'::"MetodoPagoPapeleria";
      ALTER TABLE ventas_papeleria ALTER COLUMN estado SET DEFAULT 'COMPLETADA'::"EstadoVentaPapeleria";
    `);

    await client.query(`
      ALTER TABLE compras_papeleria ALTER COLUMN estado DROP DEFAULT;
      
      ALTER TABLE compras_papeleria 
      ALTER COLUMN estado TYPE "EstadoCompraPapeleria" 
      USING upper(estado::text)::"EstadoCompraPapeleria";

      ALTER TABLE compras_papeleria ALTER COLUMN estado SET DEFAULT 'PENDIENTE'::"EstadoCompraPapeleria";
    `);

    console.log("Done updating schema!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

runSQL();
