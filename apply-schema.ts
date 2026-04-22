import { Client } from 'pg';
import "dotenv/config"; // load env

async function runSQL() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    console.log("Adding columns to productos_papeleria...");
    await client.query(`
      ALTER TABLE productos_papeleria 
      ADD COLUMN IF NOT EXISTS aplica_impuesto boolean DEFAULT false NOT NULL,
      ADD COLUMN IF NOT EXISTS tasa_impuesto numeric(5,2) DEFAULT '0' NOT NULL,
      ADD COLUMN IF NOT EXISTS costo_promedio numeric(10,2) DEFAULT '0' NOT NULL;
    `);

    console.log("Adding columns to detalles_venta_papeleria...");
    await client.query(`
      ALTER TABLE detalles_venta_papeleria
      ADD COLUMN IF NOT EXISTS lote varchar(50),
      ADD COLUMN IF NOT EXISTS cantidad_devuelta integer DEFAULT 0 NOT NULL;
    `);

    console.log("Creating historial_costos_papeleria table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS historial_costos_papeleria (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        producto_id bigint NOT NULL REFERENCES productos_papeleria(id),
        costo_anterior numeric(10,2) NOT NULL,
        costo_nuevo numeric(10,2) NOT NULL,
        fecha_cambio timestamp with time zone DEFAULT now() NOT NULL,
        usuario_id uuid REFERENCES usuarios(id),
        motivo varchar(100)
      );
    `);
    
    // We already changed Enums in the models but creating Enums in Postgres if they don't exist:
    console.log("Creating enums...");
    const enums = [
      { name: 'EstadoVentaPapeleria', values: "('PENDIENTE', 'COMPLETADA', 'CANCELADA', 'DEVUELTA')" },
      { name: 'MetodoPagoPapeleria', values: "('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO', 'OTRO')" },
      { name: 'TipoMovimientoInventario', values: "('ENTRADA_COMPRA', 'SALIDA_VENTA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'MERMA', 'DEVOLUCION')" },
      { name: 'EstadoCompraPapeleria', values: "('BORRADOR', 'PENDIENTE', 'PROCESADA', 'CANCELADA')" }
    ];

    for (const en of enums) {
      try {
        await client.query(`CREATE TYPE "${en.name}" AS ENUM ${en.values};`);
        console.log(`Enum ${en.name} created.`);
      } catch (e: any) {
        if (e.code === '42710') { // duplicate_object
          console.log(`Enum ${en.name} already exists.`);
        } else {
          console.error(`Error creating enum ${en.name}:`, e);
        }
      }
    }

    console.log("Done updating schema!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

runSQL();
