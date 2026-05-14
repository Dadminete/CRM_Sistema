import "dotenv/config";
import { Client } from "pg";

function toNumber(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function parseArgs(argv) {
  const args = { saleNumber: "", dryRun: false, force: false };

  for (const token of argv) {
    if (!token) continue;

    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (token === "--force") {
      args.force = true;
      continue;
    }

    if (!token.startsWith("--") && !args.saleNumber) {
      args.saleNumber = token;
    }
  }

  return args;
}

function printUsage() {
  console.log("Uso:");
  console.log("  node scripts/fix-papeleria-venta-descuento-total.mjs <NUMERO_VENTA> [--dry-run] [--force]");
  console.log("");
  console.log("Ejemplos:");
  console.log("  node scripts/fix-papeleria-venta-descuento-total.mjs VP-1778791068543 --dry-run");
  console.log("  node scripts/fix-papeleria-venta-descuento-total.mjs VP-1778791068543 --force");
}

async function run() {
  const { saleNumber, dryRun, force } = parseArgs(process.argv.slice(2));

  if (!saleNumber) {
    printUsage();
    throw new Error("Debes indicar el numero de venta.");
  }

  if (!dryRun && !force) {
    printUsage();
    throw new Error("Para ejecutar cambios debes usar --force (o usar --dry-run para solo auditar).");
  }

  const connectionString = process.env.DATABASE_URL || process.env.CLOUD_DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL/CLOUD_DATABASE_URL no esta configurado");
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query("BEGIN");

    const beforeRes = await client.query(
      `SELECT id, numero_venta, subtotal, impuestos, descuentos, total, estado, metodo_pago, caja_id, movimiento_contable_id, notas
       FROM ventas_papeleria
       WHERE numero_venta = $1
       LIMIT 1`,
      [saleNumber],
    );

    if (beforeRes.rowCount === 0) {
      throw new Error(`No existe la venta ${saleNumber}`);
    }

    const venta = beforeRes.rows[0];
    const subtotal = toNumber(venta.subtotal);
    const impuestos = toNumber(venta.impuestos);
    const totalBruto = subtotal + impuestos;
    const descuentoObjetivo = totalBruto;

    let montoMovimiento = 0;
    let movimientoExiste = false;

    if (venta.movimiento_contable_id) {
      const movRes = await client.query(
        `SELECT id, monto, metodo, caja_id FROM movimientos_contables WHERE id = $1 LIMIT 1`,
        [venta.movimiento_contable_id],
      );

      if (movRes.rowCount > 0) {
        movimientoExiste = true;
        montoMovimiento = toNumber(movRes.rows[0].monto);
      }
    }

    const resumen = {
      venta: venta.numero_venta,
      subtotal,
      impuestos,
      descuentoActual: toNumber(venta.descuentos),
      descuentoObjetivo,
      totalActual: toNumber(venta.total),
      totalObjetivo: 0,
      estadoActual: venta.estado,
      estadoObjetivo: "COMPLETADA",
      metodoPago: venta.metodo_pago,
      cajaId: venta.caja_id,
      movimientoContableId: venta.movimiento_contable_id,
      movimientoExiste,
      montoMovimiento,
      accionCaja: montoMovimiento > 0 && venta.metodo_pago === "EFECTIVO" && venta.caja_id ? `restar ${montoMovimiento.toFixed(2)}` : "sin cambios",
      accionMovimiento: movimientoExiste ? "eliminar movimiento contable" : "sin cambios",
    };

    console.log("Resumen de ajuste:\n");
    console.table([resumen]);

    if (dryRun) {
      await client.query("ROLLBACK");
      console.log("Modo --dry-run: no se aplicaron cambios.");
      return;
    }

    if (montoMovimiento > 0 && venta.metodo_pago === "EFECTIVO" && venta.caja_id) {
      await client.query(
        `UPDATE cajas
         SET saldo_actual = saldo_actual - $1::numeric
         WHERE id = $2`,
        [montoMovimiento.toFixed(2), venta.caja_id],
      );
    }

    if (movimientoExiste && venta.movimiento_contable_id) {
      await client.query(`DELETE FROM movimientos_contables WHERE id = $1`, [venta.movimiento_contable_id]);
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
      [
        descuentoObjetivo.toFixed(2),
        `Ajuste automatico ${new Date().toISOString()}: descuento total aplicado y cobro revertido`,
        venta.id,
      ],
    );

    const afterRes = await client.query(
      `SELECT numero_venta, subtotal, impuestos, descuentos, total, estado, metodo_pago, caja_id, movimiento_contable_id
       FROM ventas_papeleria
       WHERE id = $1`,
      [venta.id],
    );

    await client.query("COMMIT");

    console.log("\nVenta ajustada:");
    console.table(afterRes.rows);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("Error:", error.message || error);
  process.exit(1);
});
