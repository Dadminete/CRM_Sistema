
import * as dotenv from "dotenv";
dotenv.config();

import { db } from "./src/lib/db";
import { facturasClientes, cuentasPorCobrar } from "./src/lib/db/schema";
import { eq, and, gt, notInArray, sql } from "drizzle-orm";

async function main() {
  const VOID_STATES = ["anulada", "anulado", "cancelada", "cancelado"];

  const results = await db
    .select({
      id: facturasClientes.id,
      numeroFactura: facturasClientes.numeroFactura,
      estado: facturasClientes.estado,
      montoPendiente: cuentasPorCobrar.montoPendiente,
    })
    .from(cuentasPorCobrar)
    .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
    .where(gt(cuentasPorCobrar.montoPendiente, "0"));

  console.log("All invoices with balance > 0:");
  console.log(JSON.stringify(results, null, 2));

  const totalAll = results.reduce((acc, curr) => acc + Number(curr.montoPendiente), 0);
  console.log("\nTotal (all states):", totalAll);

  const filtered = results.filter(r => !VOID_STATES.includes((r.estado || "").toLowerCase()));
  const totalFiltered = filtered.reduce((acc, curr) => acc + Number(curr.montoPendiente), 0);
  console.log("Total (excluding voided):", totalFiltered);

  process.exit(0);
}

main().catch(console.error);
