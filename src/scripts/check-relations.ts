const { db } = require("./src/lib/db");
const { facturasClientes, suscripciones, contratos } = require("./src/lib/db/schema");
const { eq } = require("drizzle-orm");

async function check() {
  try {
    const facturas = await db
      .select({
        id: facturasClientes.id,
        numeroFactura: facturasClientes.numeroFactura,
        contratoId: facturasClientes.contratoId,
      })
      .from(facturasClientes)
      .limit(10);

    console.log("Facturas:", facturas);

    if (facturas.length > 0 && facturas[0].contratoId) {
      const contractId = facturas[0].contratoId;
      const resContrato = await db.select().from(contratos).where(eq(contratos.id, contractId)).limit(1);
      console.log("Contrato record:", resContrato);

      const resSuscripcion = await db.select().from(suscripciones).where(eq(suscripciones.id, contractId)).limit(1);
      console.log("Suscripcion record (by id):", resSuscripcion);

      if (resContrato.length > 0) {
        const resSuscByNum = await db
          .select()
          .from(suscripciones)
          .where(eq(suscripciones.numeroContrato, resContrato[0].numeroContrato))
          .limit(1);
        console.log("Suscripcion record (by numeroContrato):", resSuscByNum);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

check();
