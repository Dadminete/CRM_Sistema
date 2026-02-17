import "dotenv/config";
import { db } from "../lib/db";
import { facturasClientes, suscripciones, contratos } from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function debug() {
  try {
    console.log("Checking first 5 pending invoices and their links...");
    const facturas = await db
      .select({
        id: facturasClientes.id,
        numero: facturasClientes.numeroFactura,
        contratoId: facturasClientes.contratoId,
        clienteId: facturasClientes.clienteId,
      })
      .from(facturasClientes)
      .limit(5);

    for (const f of facturas) {
      console.log(`\nFactura: ${f.numero} (ID: ${f.id})`);
      console.log(`- ContratoID: ${f.contratoId}`);

      if (f.contratoId) {
        const c = await db.select().from(contratos).where(eq(contratos.id, f.contratoId)).limit(1);
        if (c.length > 0) {
          console.log(`  - Found Contrato: ${c[0].numeroContrato}`);
          const s = await db
            .select()
            .from(suscripciones)
            .where(eq(suscripciones.numeroContrato, c[0].numeroContrato))
            .limit(1);
          if (s.length > 0) {
            console.log(`    - Found Suscripcion diaFacturacion: ${s[0].diaFacturacion}`);
          } else {
            console.log(`    - NO Suscripcion found for numeroContrato: ${c[0].numeroContrato}`);
          }
        } else {
          console.log(`  - NO Contrato record found for ID: ${f.contratoId}`);
        }
      } else {
        // Try linking via clienteId
        const s = await db.select().from(suscripciones).where(eq(suscripciones.clienteId, f.clienteId)).limit(1);
        if (s.length > 0) {
          console.log(`  - Found Suscripcion via clienteId (diaFacturacion: ${s[0].diaFacturacion})`);
        } else {
          console.log(`  - NO Suscripcion found for clienteId: ${f.clienteId}`);
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
}

debug();
