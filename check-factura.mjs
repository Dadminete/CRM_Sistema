import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:20050209@localhost:5432/management_studio_db_v6';

const client = postgres(connectionString);
const db = drizzle(client);

async function checkFactura() {
  try {
    console.log('Checking factura FAC-00000001...\n');
    
    const result = await db.execute(sql`
      SELECT 
        fc.id as factura_id,
        fc.numero_factura,
        fc.estado as factura_estado,
        fc.fecha_factura,
        fc.cliente_id,
        fc.total as factura_total,
        cpc.id as cuenta_id,
        cpc.monto_pendiente,
        cpc.estado as cuenta_estado,
        c.nombre as cliente_nombre,
        c.apellidos as cliente_apellidos
      FROM facturas_clientes fc
      LEFT JOIN cuentas_por_cobrar cpc ON fc.id = cpc.factura_id
      LEFT JOIN clientes c ON fc.cliente_id = c.id
      WHERE fc.numero_factura = 'FAC-00000001'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No se encontró la factura FAC-00000001');
    } else {
      console.log('✅ Factura encontrada:');
      console.log(JSON.stringify(result.rows[0], null, 2));
      
      if (!result.rows[0].cuenta_id) {
        console.log('\n⚠️  La factura NO tiene cuenta por cobrar asociada!');
      } else {
        console.log('\n✅ La factura tiene cuenta por cobrar asociada');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkFactura();
