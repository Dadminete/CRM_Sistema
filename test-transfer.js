
const { db } = require('./src/lib/db');
const { traspasos, movimientosContables, cajas, categoriasCuentas } = require('./src/lib/db/schema');
const { eq, sql } = require('drizzle-orm');
const { format } = require('date-fns');

async function getTraspasoCategoryId(tx = db) {
  const row = await tx
    .select({ id: categoriasCuentas.id })
    .from(categoriasCuentas)
    .where(eq(categoriasCuentas.codigo, "TRASP-001"))
    .limit(1);
  return row[0]?.id;
}

async function testTransfer() {
  const origenId = "c5ab2edc-d32c-494d-b454-d1731c6c31df"; // Caja Principal
  const destinoId = "2ed1e8c1-0428-457f-b786-1af6d2b3cb01"; // Papeleria
  const monto = 1.50;
  const concepto = "Test Agent Transfer " + new Date().toISOString();
  const autorizadoPorId = "14794b8f-cd71-4f2b-91c5-eafae9561994"; // Daniel Beras

  try {
    const categoriaId = await getTraspasoCategoryId();
    if (!categoriaId) throw new Error("Category TRASP-001 not found");

    const prefix = `TR-${format(new Date(), "yyyyMM")}-`;
    const last = await db.execute(
        sql`SELECT numero_traspaso FROM traspasos WHERE numero_traspaso LIKE ${prefix + "%"} ORDER BY numero_traspaso DESC LIMIT 1`
    );
    const lastNum = last.rows?.[0]?.numero_traspaso;
    const seq = lastNum ? parseInt(lastNum.slice(-5), 10) + 1 : 1;
    const numero = `${prefix}${seq.toString().padStart(5, "0")}`;

    console.log(`Testing transfer ${numero}...`);

    await db.transaction(async (tx) => {
      const fecha = new Date().toISOString();
      
      // Insert Traspaso
      await tx.insert(traspasos).values({
        numeroTraspaso: numero,
        fechaTraspaso: fecha,
        monto: String(monto),
        moneda: "DOP",
        conceptoTraspaso: concepto,
        cajaOrigenId: origenId,
        cajaDestinoId: destinoId,
        estado: "completado",
        autorizadoPor: autorizadoPorId,
        createdAt: fecha
      });

      // Mov Origen
      await tx.insert(movimientosContables).values({
        tipo: "gasto",
        monto: String(monto),
        categoriaId,
        metodo: "caja",
        cajaId: origenId,
        descripcion: `Traspaso Test ${numero}`,
        fecha,
        usuarioId: autorizadoPorId,
        updatedAt: fecha
      });

      // Mov Destino
      await tx.insert(movimientosContables).values({
        tipo: "ingreso",
        monto: String(monto),
        categoriaId,
        metodo: "caja",
        cajaId: destinoId,
        descripcion: `Traspaso Test ${numero}`,
        fecha,
        usuarioId: autorizadoPorId,
        updatedAt: fecha
      });

      // Update Cajas
      await tx.execute(sql`UPDATE cajas SET saldo_actual = (saldo_actual::numeric - ${monto}::numeric)::numeric WHERE id = ${origenId}`);
      await tx.execute(sql`UPDATE cajas SET saldo_actual = (saldo_actual::numeric + ${monto}::numeric)::numeric WHERE id = ${destinoId}`);
    });

    console.log("Transfer successful!");
  } catch (err) {
    console.error("Transfer failed:", err);
  } finally {
      process.exit();
  }
}

testTransfer();
