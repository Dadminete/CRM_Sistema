import "dotenv/config";
import { Client } from "pg";

const SALE_NUMBER = "VP-1778791068543";

function toNumber(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function run() {
  const connectionString = process.env.DATABASE_URL || process.env.CLOUD_DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL/CLOUD_DATABASE_URL no esta configurado");
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query("BEGIN");

    const beforeRes = await client.query(
      `SELECT id, numero_venta, subtotal, impuestos, descuentos, total, estado, metodo_pago, caja_id, movimiento_contable_id
       FROM ventas_papeleria
       WHERE numero_venta = $1
       LIMIT 1`,
      [SALE_NUMBER],
    );

    if (beforeRes.rowCount === 0) {
      throw new Error(`No existe la venta ${SALE_NUMBER}`);
    }

    const venta = beforeRes.rows[0];
    const subtotal = toNumber(venta.subtotal);
    const impuestos = toNumber(venta.impuestos);
    const totalBruto = subtotal + impuestos;
    const descuentoObjetivo = totalBruto;

    if (venta.movimiento_contable_id) {
      const movRes = await client.query(
        `SELECT id, monto, metodo, caja_id FROM movimientos_contables WHERE id = $1 LIMIT 1`,
        [venta.movimiento_contable_id],
      );

      if (movRes.rowCount > 0) {
        const mov = movRes.rows[0];
        const montoMovimiento = toNumber(mov.monto);

        if (montoMovimiento > 0 && venta.metodo_pago === "EFECTIVO" && venta.caja_id) {
          await client.query(
            `UPDATE cajas
             SET saldo_actual = saldo_actual - $1::numeric
             WHERE id = $2`,
            [montoMovimiento.toFixed(2), venta.caja_id],
          );
        }

        await client.query(`DELETE FROM movimientos_contables WHERE id = $1`, [mov.id]);
      }
    }

    await client.query(
      `UPDATE ventas_papeleria
       SET descuentos = $1::numeric,
           total = 0,
           movimiento_contable_id = NULL,
           estado = 'COMPLETADA',
           updated_at = CURRENT_TIMESTAMP,
           notas = CASE
             WHEN notas IS NULL OR TRIM(notas) = '' THEN $2
             ELSE notas || E'\n' || $2
           END
       WHERE id = $3`,
      [descuentoObjetivo.toFixed(2), `Ajuste automatico ${new Date().toISOString()}: descuento total aplicado y cobro revertido`, venta.id],
    );

    const afterRes = await client.query(
      `SELECT numero_venta, subtotal, impuestos, descuentos, total, estado, metodo_pago, caja_id, movimiento_contable_id
       FROM ventas_papeleria
       WHERE id = $1`,
      [venta.id],
    );

    await client.query("COMMIT");

    console.log("Venta corregida:");
    console.table(afterRes.rows);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("Error corrigiendo venta:", error.message || error);
  process.exit(1);
});
