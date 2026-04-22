import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";

import { successResponse, errorResponse } from "@/lib/api-response";
import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";

interface Suscripcion {
  id: string;
  numero_contrato: string;
  cliente_id: string;
  servicio_id: string;
  plan_id: string;
  precio_mensual: number;
  descuento_aplicado: number;
  cliente_nombre: string;
  cliente_apellidos: string;
  servicio_nombre: string;
  plan_nombre: string;
}

interface FacturaData {
  periodoDe: Date;
  periodoHasta: Date;
  fechaFactura: Date;
  fechaVencimiento: Date;
  mesPeriodo: number;
  anioPeriodo: number;
  usuarioId: string;
}

async function generarNumeroFactura(): Promise<string> {
  const anioActual = new Date().getFullYear();
  const patron = `^FAC-${anioActual}-[0-9]{5}$`;
  
  // Extrae el número después de "FAC-YYYY-" (últimos 5 dígitos)
  const resultado = await db.execute(sql`
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(numero_factura FROM 10) AS INTEGER)), 
      0
    ) + 1 as siguiente
    FROM facturas_clientes
    WHERE numero_factura ~ ${patron}
  `);
  
  const siguienteNumero = resultado.rows[0]?.siguiente || 1;
  return `FAC-${anioActual}-${String(siguienteNumero).padStart(5, "0")}`;
}

function calcularMontos(suscripcion: Suscripcion, itbisPorcentaje: number) {
  const precioBase = Number(suscripcion.precio_mensual || 0);
  const descuentoPorcentaje = Number(suscripcion.descuento_aplicado || 0);
  const descuentoMonto = (precioBase * descuentoPorcentaje) / 100;
  const subtotal = precioBase - descuentoMonto;
  const itbis = subtotal * (itbisPorcentaje / 100);
  const total = subtotal + itbis;

  return { precioBase, descuentoMonto, subtotal, itbis, total };
}

function generarConcepto(
  suscripcion: Suscripcion,
  mesPeriodo: number,
  anioPeriodo: number,
  pagoAdelantadoUnMes = false,
): string {
  if (suscripcion.servicio_nombre) {
    let concepto = suscripcion.servicio_nombre;
    if (suscripcion.plan_nombre) {
      concepto += ` - Plan ${suscripcion.plan_nombre}`;
    }
    const sufijo = pagoAdelantadoUnMes ? ` - PAGO ADELANTADO (1 MES)` : "";
    return `${concepto} (${mesPeriodo}/${anioPeriodo})${sufijo}`;
  }
  const sufijo = pagoAdelantadoUnMes ? ` - PAGO ADELANTADO (1 MES)` : "";
  return `Servicio - Contrato ${suscripcion.numero_contrato} (${mesPeriodo}/${anioPeriodo})${sufijo}`;
}

async function crearFactura(
  suscripcion: Suscripcion,
  facturaData: FacturaData,
  itbisPorcentaje: number,
  descuentoManualMonto = 0,
  pagoAdelantadoUnMes = false,
): Promise<{ numeroFactura: string; total: number }> {
  const numeroFactura = await generarNumeroFactura();
  const { precioBase, descuentoMonto, subtotal } =
    calcularMontos(suscripcion, itbisPorcentaje);

  if (descuentoManualMonto < 0) {
    throw new Error("El descuento manual no puede ser negativo");
  }

  if (descuentoManualMonto > subtotal) {
    throw new Error("El descuento manual no puede exceder el subtotal de la factura");
  }

  const subtotalTrasDescuentoManual = subtotal - descuentoManualMonto;
  const itbis = subtotalTrasDescuentoManual * (itbisPorcentaje / 100);
  const total = subtotalTrasDescuentoManual + itbis;
  const descuentoTotal = descuentoMonto + descuentoManualMonto;

  const concepto = generarConcepto(
    suscripcion,
    facturaData.mesPeriodo,
    facturaData.anioPeriodo,
    pagoAdelantadoUnMes,
  );
  const mesAdelantadoTag = `${String(facturaData.mesPeriodo).padStart(2, "0")}-${facturaData.anioPeriodo}`;
  const observacionesAdelantado = pagoAdelantadoUnMes
    ? `PAGO_ADELANTADO | MESES_ADELANTADOS:1 | MES_ADELANTADO:${mesAdelantadoTag}`
    : null;

  // Transacción para asegurar que todas las inserciones se completen o ninguna
  const result = await db.execute(sql`
    WITH nueva_factura AS (
      INSERT INTO facturas_clientes (
        numero_factura, cliente_id, tipo_factura, fecha_factura, fecha_vencimiento,
        periodo_facturado_inicio, periodo_facturado_fin, subtotal, descuento,
        itbis, total, estado, observaciones, facturada_por, created_at, updated_at
      ) VALUES (
        ${numeroFactura}, ${suscripcion.cliente_id}, 'servicio',
        ${facturaData.fechaFactura.toISOString()},
        ${facturaData.fechaVencimiento.toISOString()},
        ${facturaData.periodoDe.toISOString()},
        ${facturaData.periodoHasta.toISOString()},
        ${subtotalTrasDescuentoManual}, ${descuentoTotal}, ${itbis}, ${total},
        'pendiente', ${observacionesAdelantado}, ${facturaData.usuarioId}, NOW(), NOW()
      ) RETURNING id
    ),
    nuevo_detalle AS (
      INSERT INTO detalle_facturas (
        factura_id, concepto, cantidad, precio_unitario, subtotal,
        descuento, impuesto, total, servicio_id, orden
      )
      SELECT id, ${concepto}, 1, ${precioBase}, ${subtotal},
        ${descuentoTotal}, ${itbis}, ${total}, ${suscripcion.servicio_id}, 1
      FROM nueva_factura
      RETURNING factura_id
    )
    INSERT INTO cuentas_por_cobrar (
      factura_id, cliente_id, numero_documento, fecha_emision,
      fecha_vencimiento, monto_original, monto_pendiente, estado, created_at, updated_at
    )
    SELECT id, ${suscripcion.cliente_id}, ${numeroFactura},
      ${facturaData.fechaFactura.toISOString()},
      ${facturaData.fechaVencimiento.toISOString()},
      ${total}, ${total}, 'pendiente', NOW(), NOW()
    FROM nueva_factura
    RETURNING factura_id
  `);

  if (!result.rows || result.rows.length === 0) {
    throw new Error("Error en la transacción: no se completaron todas las inserciones");
  }

  return { numeroFactura, total };
}

/**
 * POST /api/facturas/crear-masivo
 * Crea facturas masivamente desde suscripciones
 */
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const {
      suscripcionIds,
      mesPeriodo,
      anioPeriodo,
      itbisPorcentaje = 18,
      descuentoManualMonto = 0,
      pagoAdelantadoUnMes = false,
      mesAdelantado,
      anioAdelantado,
    } = body;

    if (!suscripcionIds || !Array.isArray(suscripcionIds) || suscripcionIds.length === 0) {
      return errorResponse("Debe seleccionar al menos una suscripción", 400);
    }

    if (!mesPeriodo || mesPeriodo < 1 || mesPeriodo > 12) {
      return errorResponse("El mes debe estar entre 1 y 12", 400);
    }

    if (!anioPeriodo || anioPeriodo < 2000) {
      return errorResponse("El año es inválido", 400);
    }

    if (Boolean(pagoAdelantadoUnMes)) {
      if (!mesAdelantado || Number(mesAdelantado) < 1 || Number(mesAdelantado) > 12) {
        return errorResponse("Debe indicar un mes válido para el pago adelantado", 400);
      }
      if (!anioAdelantado || Number(anioAdelantado) < 2000) {
        return errorResponse("Debe indicar un año válido para el pago adelantado", 400);
      }
    }

    if (Number(descuentoManualMonto || 0) < 0) {
      return errorResponse("El descuento manual no puede ser negativo", 400);
    }

    if (Number(descuentoManualMonto || 0) > 0 && Number(descuentoManualMonto || 0) < 1) {
      return errorResponse("El descuento manual debe ser desde RD$1 en adelante", 400);
    }

    const mesObjetivo = Boolean(pagoAdelantadoUnMes) ? Number(mesAdelantado) : Number(mesPeriodo);
    const anioObjetivo = Boolean(pagoAdelantadoUnMes) ? Number(anioAdelantado) : Number(anioPeriodo);

    const facturaData: FacturaData = {
      periodoDe: new Date(anioObjetivo, mesObjetivo - 1, 1),
      periodoHasta: new Date(anioObjetivo, mesObjetivo, 0),
      fechaFactura: new Date(),
      fechaVencimiento: new Date(anioObjetivo, mesObjetivo - 1, 15),
      mesPeriodo: mesObjetivo,
      anioPeriodo: anioObjetivo,
      usuarioId: user.id,
    };

    const suscripciones = await db.execute(sql`
      SELECT 
        s.id, s.numero_contrato, s.cliente_id, s.servicio_id, s.plan_id,
        s.precio_mensual, s.descuento_aplicado,
        c.nombre as cliente_nombre, c.apellidos as cliente_apellidos,
        srv.nombre as servicio_nombre, p.nombre as plan_nombre
      FROM suscripciones s
      INNER JOIN clientes c ON s.cliente_id = c.id
      LEFT JOIN servicios srv ON s.servicio_id = srv.id
      LEFT JOIN planes p ON s.plan_id = p.id
      WHERE s.id IN (${sql.join(suscripcionIds.map((id: string) => sql`${id}`), sql`, `)}) 
        AND s.estado = 'activo'
    `);

    if (suscripciones.rows.length === 0) {
      return errorResponse("No se encontraron suscripciones activas válidas", 404);
    }

    const descuentoManualNumerico = Number(descuentoManualMonto || 0);
    if (descuentoManualNumerico > 0) {
      const clientesUnicos = new Set(
        (suscripciones.rows as unknown as Suscripcion[]).map((suscripcion) => suscripcion.cliente_id),
      );

      if (clientesUnicos.size > 1) {
        return errorResponse(
          "El descuento manual solo está permitido cuando selecciona suscripciones de un solo cliente",
          400,
        );
      }
    }

    const facturasCreadas = [];
    const errores = [];

    const suscripcionesTyped = suscripciones.rows as unknown as Suscripcion[];
    const subtotalesBase = suscripcionesTyped.map((suscripcion) => {
      const { subtotal } = calcularMontos(suscripcion, itbisPorcentaje);
      return Math.max(0, subtotal);
    });
    const subtotalesAcumulados = subtotalesBase.reduce((acc, current) => acc + current, 0);

    let descuentoPendienteDistribuir = descuentoManualNumerico;

    for (let index = 0; index < suscripcionesTyped.length; index++) {
      const suscripcion = suscripcionesTyped[index];
      try {
        let descuentoManualFactura = 0;
        if (descuentoManualNumerico > 0 && subtotalesAcumulados > 0) {
          if (index === suscripcionesTyped.length - 1) {
            descuentoManualFactura = Math.max(0, Number(descuentoPendienteDistribuir.toFixed(2)));
          } else {
            descuentoManualFactura = Number(
              ((descuentoManualNumerico * subtotalesBase[index]) / subtotalesAcumulados).toFixed(2),
            );
            descuentoPendienteDistribuir = Number((descuentoPendienteDistribuir - descuentoManualFactura).toFixed(2));
          }
        }

        const { numeroFactura, total } = await crearFactura(
          suscripcion,
          facturaData,
          itbisPorcentaje,
          descuentoManualFactura,
          Boolean(pagoAdelantadoUnMes),
        );
        facturasCreadas.push({
          numeroFactura,
          clienteNombre: `${suscripcion.cliente_nombre} ${suscripcion.cliente_apellidos}`,
          numeroContrato: suscripcion.numero_contrato,
          total,
          pagoAdelantadoUnMes: Boolean(pagoAdelantadoUnMes),
        });
      } catch (error: any) {
        console.error(`Error creando factura para ${suscripcion.numero_contrato}:`, error);
        errores.push({
          numeroContrato: suscripcion.numero_contrato,
          error: error.message || String(error),
        });
      }
    }

    return successResponse({
      facturasCreadas,
      totalCreadas: facturasCreadas.length,
      errores,
      totalErrores: errores.length,
    });
  } catch (error: any) {
    return errorResponse("Error al crear facturas: " + error.message, 500);
  }
});
