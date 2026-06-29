import { NextRequest } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  categoriasCuentas,
  cuentasPorCobrar,
  detalleFacturas,
  facturasClientes,
  movimientosContables,
  pagosClientes,
  sesionesCaja,
  suscripciones,
} from "@/lib/db/schema";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  calcularCantidadPeriodosAdelantados,
  calcularMesesAdelantadosAdicionales,
  formatearPeriodoFacturado,
  resolverPeriodoBaseAdelantado,
} from "@/app/api/facturas/lib/periodos";

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

interface AdelantadoMeta {
  habilitado: boolean;
  mesesAdelantados: number;
  indicePeriodo: number;
  totalPeriodos: number;
}

async function generarNumeroFacturaTx(tx: any): Promise<string> {
  const anioActual = new Date().getFullYear();
  const patron = `^FAC-${anioActual}-[0-9]{5}$`;

  const resultado = await tx.execute(sql`
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
  metaAdelantado?: AdelantadoMeta,
): string {
  const pagoAdelantadoHabilitado = Boolean(metaAdelantado?.habilitado);
  const periodoLabel = formatearPeriodoFacturado(mesPeriodo, anioPeriodo, { mayusculas: false });
  const sufijoAdelantado = pagoAdelantadoHabilitado
    ? ` - PAGO ADELANTADO (${metaAdelantado?.mesesAdelantados ?? 0} MES${
        (metaAdelantado?.mesesAdelantados ?? 0) === 1 ? "" : "ES"
      })`
    : "";

  if (suscripcion.servicio_nombre) {
    let concepto = suscripcion.servicio_nombre;
    if (suscripcion.plan_nombre) {
      concepto += ` - Plan ${suscripcion.plan_nombre}`;
    }
    return `${concepto} (${periodoLabel})${sufijoAdelantado}`;
  }
  return `Servicio - Contrato ${suscripcion.numero_contrato} (${periodoLabel})${sufijoAdelantado}`;
}

function getPeriodoOffset(
  mesBase: number,
  anioBase: number,
  offset: number,
): Pick<FacturaData, "periodoDe" | "periodoHasta" | "fechaVencimiento" | "mesPeriodo" | "anioPeriodo"> {
  const base = new Date(anioBase, mesBase - 1 + offset, 1);
  const mes = base.getMonth() + 1;
  const anio = base.getFullYear();

  return {
    periodoDe: new Date(anio, mes - 1, 1),
    periodoHasta: new Date(anio, mes, 0),
    fechaVencimiento: new Date(anio, mes - 1, 15),
    mesPeriodo: mes,
    anioPeriodo: anio,
  };
}

async function crearFacturaTx(
  tx: any,
  suscripcion: Suscripcion,
  facturaData: FacturaData,
  itbisPorcentaje: number,
  descuentoManualMonto = 0,
  metaAdelantado?: AdelantadoMeta,
  forzarCreacion = false,
): Promise<{ id: string; numeroFactura: string; total: number }> {
  const periodoInicioIso = facturaData.periodoDe.toISOString().split("T")[0];
  const periodoFinIso = facturaData.periodoHasta.toISOString().split("T")[0];

  if (!forzarCreacion) {
    const facturaExistente = await tx.execute(sql`
      SELECT fc.id, fc.numero_factura
      FROM facturas_clientes fc
      INNER JOIN detalle_facturas df ON df.factura_id = fc.id
      WHERE fc.cliente_id = ${suscripcion.cliente_id}
        AND fc.periodo_facturado_inicio = ${periodoInicioIso}
        AND fc.periodo_facturado_fin = ${periodoFinIso}
        AND df.servicio_id = ${suscripcion.servicio_id}
        AND COALESCE(fc.estado, '') NOT IN ('anulada', 'cancelada')
      LIMIT 1
    `);

    if (facturaExistente.rows.length > 0) {
      const existente = facturaExistente.rows[0] as { numero_factura?: string };
      throw new Error(
        `Ya existe una factura para este cliente/servicio en ${facturaData.mesPeriodo}/${facturaData.anioPeriodo}${
          existente?.numero_factura ? ` (${existente.numero_factura})` : ""
        }`,
      );
    }
  }

  const numeroFactura = await generarNumeroFacturaTx(tx);
  const { precioBase, descuentoMonto, subtotal } = calcularMontos(suscripcion, itbisPorcentaje);

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

  const concepto = generarConcepto(suscripcion, facturaData.mesPeriodo, facturaData.anioPeriodo, metaAdelantado);
  const mesAdelantadoTag = `${String(facturaData.mesPeriodo).padStart(2, "0")}-${facturaData.anioPeriodo}`;
  const observacionesAdelantado = metaAdelantado?.habilitado
    ? `PAGO_ADELANTADO | MESES_ADELANTADOS:${metaAdelantado.mesesAdelantados} | PERIODO_ADELANTADO:${mesAdelantadoTag} | PERIODO_LOTE:${metaAdelantado.indicePeriodo + 1}/${metaAdelantado.totalPeriodos}`
    : null;

  const result = await tx.execute(sql`
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

  const createdId = result.rows[0].factura_id as string;

  return { id: createdId, numeroFactura, total };
}

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const {
      suscripcionIds,
      mesPeriodo,
      anioPeriodo,
      itbisPorcentaje = 18,
      descuentoManualMonto = 0,
      pagoAdelantado = false,
      mesesAdelantados,
      pagoAdelantadoUnMes = false,
      mesAdelantado,
      anioAdelantado,
      forzarCreacion = false,
      registrarPagoInmediato = false,
      metodoPago,
      cajaId,
      cuentaBancariaId,
      numeroReferencia,
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

    const isLegacyAdvanceMode = Boolean(pagoAdelantadoUnMes) && typeof mesesAdelantados === "undefined";
    const pagoAdelantadoHabilitado = Boolean(pagoAdelantado) || Boolean(pagoAdelantadoUnMes);

    let mesesAdelantadosNormalizado = Number(mesesAdelantados ?? 0);
    if (isLegacyAdvanceMode) {
      mesesAdelantadosNormalizado = 0;
    }

    if (!Number.isInteger(mesesAdelantadosNormalizado) || mesesAdelantadosNormalizado < 0) {
      return errorResponse("Los meses adelantados deben ser un número entero mayor o igual a 0", 400);
    }

    if (mesesAdelantadosNormalizado > 24) {
      return errorResponse("No se permiten más de 24 meses adelantados en una sola operación", 400);
    }

    const cantidadPeriodosAdelantados = calcularCantidadPeriodosAdelantados(mesesAdelantadosNormalizado);
    const mesesAdelantadosAdicionales = calcularMesesAdelantadosAdicionales(mesesAdelantadosNormalizado);

    if (pagoAdelantadoHabilitado && isLegacyAdvanceMode) {
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

    // Validar parámetros de pago inmediato si está habilitado
    if (registrarPagoInmediato) {
      if (!metodoPago) {
        return errorResponse("Debe especificar el método de pago", 400);
      }
      if (metodoPago === "efectivo" && !cajaId) {
        return errorResponse("Debe seleccionar una caja para pagos en efectivo", 400);
      }
      if (metodoPago !== "efectivo" && !cuentaBancariaId) {
        return errorResponse("Debe seleccionar una cuenta bancaria", 400);
      }

      // Validar sesión de caja si es efectivo
      if (metodoPago === "efectivo") {
        const session = await db
          .select()
          .from(sesionesCaja)
          .where(and(eq(sesionesCaja.cajaId, cajaId), eq(sesionesCaja.estado, "abierta")))
          .limit(1);

        if (session.length === 0) {
          return errorResponse("La caja seleccionada está cerrada. Debe abrir una sesión primero.", 403);
        }
      }
    }

    const { mes: mesInicio, anio: anioInicio } = resolverPeriodoBaseAdelantado({
      pagoAdelantadoHabilitado,
      mesPeriodo,
      anioPeriodo,
      mesAdelantado,
      anioAdelantado,
      isLegacyAdvanceMode,
    });

    const cantidadPeriodos = pagoAdelantadoHabilitado ? cantidadPeriodosAdelantados : 1;

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

    // Obtener categoría de ingresos para los movimientos contables del pago inmediato
    let categoriaIngreso: any = null;
    if (registrarPagoInmediato) {
      categoriaIngreso = await db.query.categoriasCuentas.findFirst({
        where: (categorias, { eq, or, ilike }) =>
          or(
            ilike(categorias.nombre, "%ingreso%"),
            ilike(categorias.nombre, "%venta%"),
            ilike(categorias.nombre, "%factur%"),
          ),
      });

      if (!categoriaIngreso) {
        return errorResponse(
          "No se encontró una categoría válida para registrar ingresos. Por favor cree una categoría de ingresos en contabilidad.",
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

    for (let offsetPeriodo = 0; offsetPeriodo < cantidadPeriodos; offsetPeriodo++) {
      const periodo = getPeriodoOffset(mesInicio, anioInicio, offsetPeriodo);
      const facturaDataPeriodo: FacturaData = {
        ...periodo,
        fechaFactura: new Date(),
        usuarioId: user.id,
      };

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

          // Crear factura (y pago si corresponde) dentro de una transacción por cada elemento del lote
          const { numeroFactura, total } = await db.transaction(async (tx) => {
            const { id: facturaId, numeroFactura, total } = await crearFacturaTx(
              tx,
              suscripcion,
              facturaDataPeriodo,
              itbisPorcentaje,
              descuentoManualFactura,
              {
                habilitado: pagoAdelantadoHabilitado,
                mesesAdelantados: mesesAdelantadosAdicionales,
                indicePeriodo: offsetPeriodo,
                totalPeriodos: cantidadPeriodos,
              },
              forzarCreacion,
            );

            // Registrar pago inmediato si corresponde
            if (registrarPagoInmediato) {
              // Generar número de pago
              const lastPago = await tx
                .select({ num: pagosClientes.numeroPago })
                .from(pagosClientes)
                .orderBy(desc(pagosClientes.numeroPago))
                .limit(1);

              let nextNum = "PAG-0001";
              if (lastPago.length > 0) {
                const current = parseInt(lastPago[0].num.split("-")[1], 10);
                nextNum = `PAG-${(current + 1).toString().padStart(4, "0")}`;
              }

              // Insertar Pago
              const esPagoAdelantado = pagoAdelantadoHabilitado;
              const observacionesPago = esPagoAdelantado
                ? `PAGO_ADELANTADO | MESES_ADELANTADOS:${mesesAdelantadosAdicionales}`
                : "PAGO_INMEDIATO_CREACION";

              await tx.insert(pagosClientes).values({
                facturaId,
                clienteId: suscripcion.cliente_id,
                numeroPago: nextNum,
                fechaPago: new Date().toISOString().split("T")[0],
                monto: total.toString(),
                descuento: "0",
                metodoPago,
                numeroReferencia: numeroReferencia || null,
                cajaId: metodoPago === "efectivo" ? cajaId : null,
                cuentaBancariaId: metodoPago !== "efectivo" ? cuentaBancariaId : null,
                recibidoPor: user.id,
                observaciones: observacionesPago,
                updatedAt: new Date().toISOString(),
              });

              // Liquidar Cuenta por Cobrar
              await tx
                .update(cuentasPorCobrar)
                .set({
                  montoPendiente: "0",
                  estado: "pagado",
                  updatedAt: new Date().toISOString(),
                })
                .where(eq(cuentasPorCobrar.facturaId, facturaId));

              // Cambiar factura a pagada
              await tx
                .update(facturasClientes)
                .set({
                  estado: "pagada",
                  observaciones: sql`
                    CASE
                      WHEN ${esPagoAdelantado} = false THEN ${facturasClientes.observaciones}
                      WHEN COALESCE(${facturasClientes.observaciones}, '') ILIKE '%PAGO_ADELANTADO%' THEN ${facturasClientes.observaciones}
                      WHEN COALESCE(${facturasClientes.observaciones}, '') = '' THEN 'PAGO_ADELANTADO'
                      ELSE ${facturasClientes.observaciones} || ' | PAGO_ADELANTADO'
                    END
                  `,
                  updatedAt: new Date().toISOString(),
                })
                .where(eq(facturasClientes.id, facturaId));

              // Crear movimiento contable (Ingreso)
              if (total > 0) {
                await tx.insert(movimientosContables).values({
                  tipo: "ingreso",
                  monto: total.toString(),
                  categoriaId: categoriaIngreso.id,
                  metodo: metodoPago,
                  cajaId: metodoPago === "efectivo" ? cajaId : null,
                  cuentaBancariaId: metodoPago !== "efectivo" ? cuentaBancariaId : null,
                  descripcion: `Pago inmediato de factura ${numeroFactura} - ${suscripcion.cliente_nombre} ${suscripcion.cliente_apellidos}`,
                  fecha: new Date().toISOString(),
                  usuarioId: user.id,
                  updatedAt: new Date().toISOString(),
                });
              }

              // Incrementar saldo de la caja si es efectivo
              if (metodoPago === "efectivo" && cajaId && total > 0) {
                await tx.execute(sql`UPDATE cajas SET saldo_actual = saldo_actual + ${total} WHERE id = ${cajaId}`);
              }

              // AUTOMATIZACIÓN: Adelantar fecha de próximo pago de la suscripción
              const [suscripcionDb] = await tx
                .select()
                .from(suscripciones)
                .where(
                  and(
                    eq(suscripciones.clienteId, suscripcion.cliente_id),
                    eq(suscripciones.servicioId, suscripcion.servicio_id),
                    eq(suscripciones.estado, "activo"),
                  ),
                )
                .limit(1);

              if (suscripcionDb) {
                const baseDateStr = suscripcionDb.fechaProximoPago || new Date().toISOString().split("T")[0];
                const baseDate = new Date(baseDateStr);

                const diaFacturacion = suscripcionDb.diaFacturacion || 1;
                // Adelantar exactamente 1 mes por cada período procesado
                baseDate.setMonth(baseDate.getMonth() + 1);
                baseDate.setDate(diaFacturacion);

                const nuevaFechaProximoPago = baseDate.toISOString().split("T")[0];

                await tx
                  .update(suscripciones)
                  .set({
                    fechaProximoPago: nuevaFechaProximoPago,
                    updatedAt: new Date().toISOString(),
                  })
                  .where(eq(suscripciones.id, suscripcionDb.id));
              }
            }

            return { numeroFactura, total };
          });

          facturasCreadas.push({
            numeroFactura,
            clienteNombre: `${suscripcion.cliente_nombre} ${suscripcion.cliente_apellidos}`,
            numeroContrato: suscripcion.numero_contrato,
            total,
            pagoAdelantado: pagoAdelantadoHabilitado,
            mesPeriodo: facturaDataPeriodo.mesPeriodo,
            anioPeriodo: facturaDataPeriodo.anioPeriodo,
          });
        } catch (error: any) {
          console.error(`Error creando factura para ${suscripcion.numero_contrato}:`, error);
          errores.push({
            numeroContrato: suscripcion.numero_contrato,
            periodo: `${facturaDataPeriodo.mesPeriodo}/${facturaDataPeriodo.anioPeriodo}`,
            error: error.message || String(error),
          });
        }
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
