import { db } from "./src/lib/db";
import { cuentasBancarias, cuentasContables, banks } from "./src/lib/db/schema";
import { eq } from "drizzle-orm";

async function checkData() {
  const result = await db
    .select({
      bankAccountId: cuentasBancarias.id,
      numeroCuenta: cuentasBancarias.numeroCuenta,
      cuentaContableId: cuentasBancarias.cuentaContableId,
      banco: banks.nombre,
      saldoActual: cuentasContables.saldoActual,
      tipoCuenta: cuentasBancarias.tipoCuenta,
    })
    .from(cuentasBancarias)
    .innerJoin(cuentasContables, eq(cuentasBancarias.cuentaContableId, cuentasContables.id))
    .innerJoin(banks, eq(cuentasBancarias.bankId, banks.id))
    .where(eq(cuentasBancarias.activo, true));

  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

checkData();
