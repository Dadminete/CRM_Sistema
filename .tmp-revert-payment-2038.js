require('dotenv').config();
const { Client } = require('pg');

const targetPaymentId = 'deafd048-30e6-42be-ad22-fdd2d8f453fb';

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  try {
    await c.query('BEGIN');

    const paymentRes = await c.query(`
      SELECT id, numero_pago, factura_id, cliente_id, monto, descuento, metodo_pago, caja_id, cuenta_bancaria_id, estado
      FROM pagos_clientes
      WHERE id = $1
      FOR UPDATE
    `, [targetPaymentId]);

    if (paymentRes.rows.length === 0) {
      throw new Error('Pago no encontrado');
    }

    const p = paymentRes.rows[0];
    const monto = Number(p.monto || 0);
    const descuento = Number(p.descuento || 0);
    const totalAplicado = monto + descuento;

    const cxcRes = await c.query(`
      SELECT id, monto_original, monto_pendiente
      FROM cuentas_por_cobrar
      WHERE factura_id = $1
      FOR UPDATE
    `, [p.factura_id]);

    if (cxcRes.rows.length === 0) {
      throw new Error('Cuenta por cobrar no encontrada para la factura');
    }

    const cxc = cxcRes.rows[0];
    const montoOriginal = Number(cxc.monto_original || 0);
    const montoPendienteActual = Number(cxc.monto_pendiente || 0);
    const nuevoPendiente = montoPendienteActual + totalAplicado;
    const nuevoEstadoCxc = nuevoPendiente <= 0 ? 'pagado' : (nuevoPendiente < montoOriginal ? 'parcial' : 'pendiente');

    await c.query(`
      UPDATE cuentas_por_cobrar
      SET monto_pendiente = $1,
          estado = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [nuevoPendiente.toFixed(2), nuevoEstadoCxc, cxc.id]);

    const facturaRes = await c.query(`
      SELECT id, descuento
      FROM facturas_clientes
      WHERE id = $1
      FOR UPDATE
    `, [p.factura_id]);

    if (facturaRes.rows.length === 0) {
      throw new Error('Factura no encontrada');
    }

    const descuentoFacturaActual = Number(facturaRes.rows[0].descuento || 0);
    const nuevoDescuentoFactura = Math.max(0, descuentoFacturaActual - descuento);
    const nuevoEstadoFactura = nuevoEstadoCxc === 'pagado' ? 'pagado' : (nuevoEstadoCxc === 'parcial' ? 'parcial' : 'pendiente');

    await c.query(`
      UPDATE facturas_clientes
      SET estado = $1,
          descuento = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [nuevoEstadoFactura, nuevoDescuentoFactura.toFixed(2), p.factura_id]);

    if (p.metodo_pago === 'efectivo' && p.caja_id) {
      await c.query(`
        UPDATE cajas
        SET saldo_actual = saldo_actual - $1,
            updated_at = NOW()
        WHERE id = $2
      `, [monto, p.caja_id]);
    }

    if ((p.metodo_pago === 'transferencia' || p.metodo_pago === 'tarjeta') && p.cuenta_bancaria_id) {
      const accRes = await c.query(`
        SELECT cuenta_contable_id
        FROM cuentas_bancarias
        WHERE id = $1
      `, [p.cuenta_bancaria_id]);

      if (accRes.rows.length > 0 && accRes.rows[0].cuenta_contable_id) {
        await c.query(`
          UPDATE cuentas_contables
          SET saldo_actual = saldo_actual - $1,
              updated_at = NOW()
          WHERE id = $2
        `, [monto, accRes.rows[0].cuenta_contable_id]);
      }
    }

    await c.query(`
      DELETE FROM movimientos_contables
      WHERE tipo = 'ingreso'
        AND descripcion LIKE ('Pago de factura ' || $1 || '%')
    `, [p.numero_pago]);

    await c.query(`DELETE FROM pagos_clientes WHERE id = $1`, [targetPaymentId]);

    await c.query('COMMIT');

    console.log(JSON.stringify({
      success: true,
      revertedPaymentId: targetPaymentId,
      numeroPago: p.numero_pago,
      facturaId: p.factura_id,
      restoredPending: nuevoPendiente.toFixed(2),
      cxcEstado: nuevoEstadoCxc,
      facturaEstado: nuevoEstadoFactura,
    }, null, 2));
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    await c.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
