import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pagosClientes,
  cuentasPorCobrar,
  facturasClientes,
  movimientosContables,
  sesionesCaja,
  clientes,
  roles,
  usuariosRoles,
  detalleFacturas,
  suscripciones,
} from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { jsonResponse } from '@/lib/serializers';
import { withAuth } from "@/lib/api-auth";

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();
    const {
      facturaId,
      clienteId,
      monto,
      descuento,
      metodoPago,
      numeroReferencia,
      cajaId,
      cuentaBancariaId,
      observaciones,
      tipoAplicacion = "normal",
      mesesAdelantados,
      adminOverride = false,
    } = body;

    // Always use authenticated active user from session, never trust usuarioId from client payload.
    const usuarioId = user.id;

    const esPagoAdelantado = String(tipoAplicacion || "normal").toLowerCase() === "adelantado";

    // 1. Validar que la factura existe y tiene balance pendiente
    const cxc = await db.select().from(cuentasPorCobrar).where(eq(cuentasPorCobrar.facturaId, facturaId)).limit(1);

    if (cxc.length === 0) {
      return jsonResponse(
        { success: false, error: "Factura no encontrada en cuentas por cobrar." },
        { status: 404 },
      );
    }

    const balanceActual = Number(cxc[0].montoPendiente);
    const montoAPagar = Number(monto);
    const descuentoAplicado = Number(descuento || 0);
    const EPSILON = 0.000001;

    if (!Number.isFinite(montoAPagar) || !Number.isFinite(descuentoAplicado)) {
      return jsonResponse({ success: false, error: "Monto o descuento inválido." }, { status: 400 });
    }

    if (montoAPagar < 0) {
      return jsonResponse({ success: false, error: "El monto a pagar no puede ser negativo." }, { status: 400 });
    }

    if (descuentoAplicado < 0) {
      return jsonResponse({ success: false, error: "El descuento no puede ser negativo." }, { status: 400 });
    }

    const totalAplicado = montoAPagar + descuentoAplicado;

    if (totalAplicado <= 0) {
      return jsonResponse({ success: false, error: "El monto o descuento debe ser mayor a 0." }, { status: 400 });
    }

    if (totalAplicado > balanceActual) {
      // If adminOverride is requested, verify the user is actually an admin server-side
      if (adminOverride) {
        const adminRows = await db
          .select({ nombreRol: roles.nombreRol })
          .from(usuariosRoles)
          .innerJoin(roles, eq(usuariosRoles.rolId, roles.id))
          .where(and(eq(usuariosRoles.usuarioId, usuarioId), eq(usuariosRoles.activo, true)))
          .limit(1);

        const esAdmin =
          adminRows.length > 0 && adminRows[0].nombreRol.toLowerCase().includes("admin");

        if (!esAdmin) {
          return jsonResponse(
            { success: false, error: "No autorizado para aplicar descuento mayor al saldo pendiente." },
            { status: 403 },
          );
        }
        // Admin verified — allow the override and continue
      } else {
        return jsonResponse(
          { success: false, error: "El total aplicado (pago + descuento) no puede ser mayor al balance pendiente." },
          { status: 400 },
        );
      }
    }

    // 2. Si el pago es en efectivo y hay monto recibido, validar sesión de caja abierta
    if (metodoPago === "efectivo" && montoAPagar > 0) {
      if (!cajaId) {
        return jsonResponse(
          { success: false, error: "Debe seleccionar una caja para pagos en efectivo." },
          { status: 400 },
        );
      }

      const session = await db
        .select()
        .from(sesionesCaja)
        .where(and(eq(sesionesCaja.cajaId, cajaId), eq(sesionesCaja.estado, "abierta")))
        .limit(1);

      if (session.length === 0) {
        return jsonResponse(
          {
            success: false,
            error: "La caja seleccionada está cerrada. Debe abrirla para procesar el pago.",
          },
          { status: 403 },
        );
      }
    }

    // 0. Obtener una categoría válida para el movimiento (Ingreso)
    const categoria = await db.query.categoriasCuentas.findFirst({
      where: (categorias, { eq, or, ilike }) =>
        or(
          ilike(categorias.nombre, "%ingreso%"),
          ilike(categorias.nombre, "%venta%"),
          ilike(categorias.nombre, "%factur%"),
        ),
    });

    if (!categoria) {
      return jsonResponse(
        {
          success: false,
          error:
            "No se encontró una categoría válida para registrar el ingreso. Por favor cree una categoría de 'Ingresos' o 'Ventas' en contabilidad.",
        },
        { status: 400 },
      );
    }

    // 0.1 Obtener nombre del cliente
    const clienteData = await db
      .select({ nombre: clientes.nombre, apellidos: clientes.apellidos })
      .from(clientes)
      .where(eq(clientes.id, clienteId))
      .limit(1);

    const nombreCliente =
      clienteData.length > 0 ? `${clienteData[0].nombre} ${clienteData[0].apellidos}`.trim() : "Cliente Desconocido";

    // 3. Procesar el pago (Transacción)
    const result = await db.transaction(async (tx) => {
      const descuentoAplicadoReal = Math.min(descuentoAplicado, balanceActual);
      const restanteTrasDescuento = Math.max(0, balanceActual - descuentoAplicadoReal);
      const montoAplicadoReal = Math.min(montoAPagar, restanteTrasDescuento);
      const totalAplicadoReal = montoAplicadoReal + descuentoAplicadoReal;

      // A. Generar número de pago correlativo
      const lastPago = await tx
        .select({ num: pagosClientes.numeroPago })
        .from(pagosClientes)
        .orderBy(desc(pagosClientes.numeroPago))
        .limit(1);

      let nextNum = "PAG-0001";
      if (lastPago.length > 0) {
        const current = parseInt(lastPago[0].num.split("-")[1]);
        nextNum = `PAG-${(current + 1).toString().padStart(4, "0")}`;
      }

      // B. Insertar registro de pago
      const [pago] = await tx
        .insert(pagosClientes)
        .values({
          facturaId,
          clienteId,
          numeroPago: nextNum,
          fechaPago: new Date().toISOString().split("T")[0],
          monto: montoAplicadoReal.toString(),
          descuento: descuentoAplicadoReal.toString(),
          metodoPago,
          numeroReferencia,
          cajaId: montoAplicadoReal > 0 ? cajaId : null,
          cuentaBancariaId,
          recibidoPor: usuarioId,
          observaciones: (() => {
            const partes = [observaciones].filter((v) => typeof v === "string" && v.trim().length > 0) as string[];
            if (montoAplicadoReal === 0 && descuentoAplicadoReal > 0) {
              partes.push("CONDONACION_POR_DESCUENTO");
            }
            if (esPagoAdelantado) {
              partes.push("PAGO_ADELANTADO");
              if (Number(mesesAdelantados || 0) > 0) {
                partes.push(`MESES_ADELANTADOS:${Number(mesesAdelantados)}`);
              }
            }
            return partes.length > 0 ? partes.join(" | ") : null;
          })(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      // C. Actualizar cuenta por cobrar
      const nuevoBalanceCalculado = balanceActual - totalAplicadoReal;
      const nuevoBalance = nuevoBalanceCalculado <= EPSILON ? 0 : nuevoBalanceCalculado;
      const nuevoEstado = nuevoBalance === 0 ? "pagado" : "parcial";

      await tx
        .update(cuentasPorCobrar)
        .set({
          montoPendiente: nuevoBalance.toString(),
          estado: nuevoEstado,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(cuentasPorCobrar.facturaId, facturaId));

      // D. Actualizar estado de la factura
      const facturaActual = await tx
        .select({ descuento: facturasClientes.descuento })
        .from(facturasClientes)
        .where(eq(facturasClientes.id, facturaId))
        .limit(1);

      const descuentoFacturaActual = Number(facturaActual[0]?.descuento || 0);
      const nuevoDescuentoFactura = descuentoFacturaActual + descuentoAplicadoReal;
      const nuevoEstadoFactura = nuevoBalance === 0 ? "pagada" : "parcial";

      await tx
        .update(facturasClientes)
        .set({
          estado: nuevoEstadoFactura,
          descuento: nuevoDescuentoFactura.toString(),
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

      // E. Crear movimiento contable (Ingreso)
      if (montoAplicadoReal > 0) {
        await tx.insert(movimientosContables).values({
          tipo: "ingreso",
          monto: montoAplicadoReal.toString(),
          categoriaId: categoria.id,
          metodo: metodoPago,
          cajaId,
          cuentaBancariaId,
          descripcion: `Pago de factura ${nextNum} - ${nombreCliente}`,
          fecha: new Date().toISOString(),
          usuarioId,
          updatedAt: new Date().toISOString(),
        });
      }

      // F. Actualizar balance de caja si es efectivo
      if (metodoPago === "efectivo" && cajaId && montoAplicadoReal > 0) {
        await tx.execute(
          sql`UPDATE cajas SET saldo_actual = saldo_actual + ${montoAplicadoReal} WHERE id = ${cajaId}`
        );
      }

      // G. AUTOMATIZACIÓN: Actualizar suscripción si la factura está totalmente pagada
      if (nuevoEstado === "pagado") {
        try {
          const items = await tx
            .select({ servicioId: detalleFacturas.servicioId })
            .from(detalleFacturas)
            .where(eq(detalleFacturas.facturaId, facturaId))
            .limit(1);

          if (items.length > 0 && items[0].servicioId) {
            const servicioId = items[0].servicioId;

            const [suscripcion] = await tx
              .select()
              .from(suscripciones)
              .where(
                and(
                  eq(suscripciones.clienteId, clienteId),
                  eq(suscripciones.servicioId, servicioId),
                  eq(suscripciones.estado, "activo")
                )
              )
              .limit(1);

            if (suscripcion) {
              const baseDateStr = suscripcion.fechaProximoPago || new Date().toISOString().split('T')[0];
              const baseDate = new Date(baseDateStr);
              
              const diaFacturacion = suscripcion.diaFacturacion || 1;
              const skipMonths = 1 + (Number(mesesAdelantados) || 0);

              baseDate.setMonth(baseDate.getMonth() + skipMonths);
              baseDate.setDate(diaFacturacion);

              const nuevaFechaProximoPago = baseDate.toISOString().split('T')[0];

              await tx
                .update(suscripciones)
                .set({
                  fechaProximoPago: nuevaFechaProximoPago,
                  updatedAt: new Date().toISOString(),
                })
                .where(eq(suscripciones.id, suscripcion.id));

              console.log(`[Automation] updated subscription ${suscripcion.id} to ${nuevaFechaProximoPago}`);
            }
          }
        } catch (autoErr) {
          console.error("[Automation Error] Failed to update subscription:", autoErr);
        }
      }

      return pago;
    });

    return jsonResponse({ success: true, data: result });
  } catch (error: any) {
    console.error("Error processing payment:", error);
    return jsonResponse({ success: false, error: error.message }, { status: 500 });
  }
});
