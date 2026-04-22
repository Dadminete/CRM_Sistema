import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql, ilike } from "drizzle-orm";

import { db } from "@/lib/db";
import { cuentasPorCobrar, facturasClientes, pagosClientes, cajas, movimientosContables } from "@/lib/db/schema";
import { jsonResponse } from "@/lib/serializers";

const patchFacturaSchema = z.object({
  accion: z.enum(["cancelar", "anular", "reactivar"]).optional(),
  estado: z.enum(["pendiente", "parcial", "pagada", "cancelada", "anulada"]).optional(),
  fechaVencimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
    .nullable()
    .optional(),
  observaciones: z.string().max(1000).nullable().optional(),
  subtotal: z.number().nonnegative().optional(),
  descuento: z.number().min(0).optional(),
  itbis: z.number().min(0).optional(),
  total: z.number().positive().optional(),
});

const round2 = (value: number) => Math.round(value * 100) / 100;

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = await req.json();
    const parsed = patchFacturaSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Payload inválido" },
        { status: 400 },
      );
    }

    const body = parsed.data;

    const factura = await db
      .select({
        id: facturasClientes.id,
        estado: facturasClientes.estado,
        subtotal: facturasClientes.subtotal,
        descuento: facturasClientes.descuento,
        itbis: facturasClientes.itbis,
        total: facturasClientes.total,
      })
      .from(facturasClientes)
      .where(eq(facturasClientes.id, id))
      .limit(1);

    if (factura.length === 0) {
      return NextResponse.json({ success: false, error: "Factura no encontrada" }, { status: 404 });
    }

    const cxc = await db
      .select({
        id: cuentasPorCobrar.id,
        montoOriginal: cuentasPorCobrar.montoOriginal,
        montoPendiente: cuentasPorCobrar.montoPendiente,
      })
      .from(cuentasPorCobrar)
      .where(eq(cuentasPorCobrar.facturaId, id))
      .limit(1);

    const now = new Date().toISOString();
    const isReactivar = body.accion === "reactivar";
    const accionEstado = body.accion === "cancelar" ? "cancelada" : body.accion === "anular" ? "anulada" : null;
    const nextEstado = accionEstado ?? body.estado;

    let computedPagadoSum = 0;
    if (isReactivar) {
      const resultPagos = await db.select({ total: sql<string>`SUM(${pagosClientes.monto})`.as('total') })
        .from(pagosClientes)
        .where(and(eq(pagosClientes.facturaId, id), eq(pagosClientes.estado, 'confirmado')));
      computedPagadoSum = Number(resultPagos[0]?.total || 0);
    }

    const currentSubtotal = Number(factura[0].subtotal || 0);
    const currentDescuento = Number(factura[0].descuento || 0);
    const currentItbis = Number(factura[0].itbis || 0);
    const currentTotal = Number(factura[0].total || 0);

    const nextSubtotal = body.subtotal ?? currentSubtotal;
    const nextDescuento = body.descuento ?? currentDescuento;
    const nextItbis = body.itbis ?? currentItbis;
    const nextTotal = body.total ?? currentTotal;

    if (nextDescuento > nextSubtotal) {
      return NextResponse.json({ success: false, error: "El descuento no puede superar el subtotal." }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      const facturaUpdate: Record<string, unknown> = {
        updatedAt: now,
      };

      if (body.fechaVencimiento !== undefined) {
        facturaUpdate.fechaVencimiento = body.fechaVencimiento;
      }

      if (body.observaciones !== undefined) {
        facturaUpdate.observaciones = body.observaciones;
      }

      if (body.subtotal !== undefined) {
        facturaUpdate.subtotal = round2(nextSubtotal).toString();
      }

      if (body.descuento !== undefined) {
        facturaUpdate.descuento = round2(nextDescuento).toString();
      }

      if (body.itbis !== undefined) {
        facturaUpdate.itbis = round2(nextItbis).toString();
      }

      if (body.total !== undefined) {
        facturaUpdate.total = round2(nextTotal).toString();
      }

      if (nextEstado) {
        facturaUpdate.estado = nextEstado;
      }

      await tx.update(facturasClientes).set(facturaUpdate).where(eq(facturasClientes.id, id));

      if (cxc.length > 0) {
        const cxcRow = cxc[0];
        const originalActual = Number(cxcRow.montoOriginal || 0);
        const pendienteActual = Number(cxcRow.montoPendiente || 0);
        const pagadoActual = round2(originalActual - pendienteActual);

        let nuevoOriginal = originalActual;
        let nuevoPendiente = pendienteActual;
        let estadoCxc = pendienteActual > 0 ? (pagadoActual > 0 ? "parcial" : "pendiente") : "pagado";

        if (isReactivar) {
          nuevoPendiente = round2(Math.max(nuevoOriginal - computedPagadoSum, 0));
          if (nuevoPendiente === 0) {
            estadoCxc = "pagado";
          } else if (computedPagadoSum > 0) {
            estadoCxc = "parcial";
          } else {
            estadoCxc = "pendiente";
          }
          
          if (!nextEstado) {
            const derivedEstadoFactura = nuevoPendiente === 0 ? "pagada" : computedPagadoSum > 0 ? "parcial" : "pendiente";
            await tx
              .update(facturasClientes)
              .set({ estado: derivedEstadoFactura, updatedAt: now })
              .where(eq(facturasClientes.id, id));
          }
        }

        if (body.total !== undefined) {
          nuevoOriginal = round2(nextTotal);
          nuevoPendiente = round2(Math.max(nuevoOriginal - pagadoActual, 0));

          if (nuevoPendiente === 0) {
            estadoCxc = "pagado";
          } else if (pagadoActual > 0) {
            estadoCxc = "parcial";
          } else {
            estadoCxc = "pendiente";
          }

          if (!nextEstado) {
            const derivedEstadoFactura = nuevoPendiente === 0 ? "pagada" : pagadoActual > 0 ? "parcial" : "pendiente";
            await tx
              .update(facturasClientes)
              .set({ estado: derivedEstadoFactura, updatedAt: now })
              .where(eq(facturasClientes.id, id));
          }
        }

        if (nextEstado === "cancelada" || nextEstado === "anulada") {
          nuevoPendiente = 0;
          estadoCxc = nextEstado;

          // REVERT PAYMENTS
          const pagosRealizados = await tx
              .select({
                id: pagosClientes.id,
                numeroPago: pagosClientes.numeroPago,
                monto: pagosClientes.monto,
                cajaId: pagosClientes.cajaId,
                metodoPago: pagosClientes.metodoPago
              })
              .from(pagosClientes)
              .where(eq(pagosClientes.facturaId, id));

          for (const pago of pagosRealizados) {
             const montoPago = Number(pago.monto || 0);
             if (pago.metodoPago === "efectivo" && pago.cajaId && montoPago > 0) {
                await tx.update(cajas).set({ saldoActual: sql`${cajas.saldoActual} - ${montoPago}` }).where(eq(cajas.id, pago.cajaId));
             }
             await tx.delete(movimientosContables).where(
                and(
                   eq(movimientosContables.tipo, "ingreso"),
                   ilike(movimientosContables.descripcion, `Pago de factura ${pago.numeroPago}%`)
                )
             );
          }
          await tx.delete(pagosClientes).where(eq(pagosClientes.facturaId, id));
        }

        if (nextEstado === "pagada") {
          nuevoPendiente = 0;
          estadoCxc = "pagado";
        }

        await tx
          .update(cuentasPorCobrar)
          .set({
            montoOriginal: round2(nuevoOriginal).toString(),
            montoPendiente: round2(nuevoPendiente).toString(),
            estado: estadoCxc,
            updatedAt: now,
          })
          .where(and(eq(cuentasPorCobrar.id, cxcRow.id), eq(cuentasPorCobrar.facturaId, id)));
      }
    });

    const [updatedFactura] = await db
      .select({
        id: facturasClientes.id,
        estado: facturasClientes.estado,
        subtotal: facturasClientes.subtotal,
        descuento: facturasClientes.descuento,
        itbis: facturasClientes.itbis,
        total: facturasClientes.total,
        fechaVencimiento: facturasClientes.fechaVencimiento,
        observaciones: facturasClientes.observaciones,
      })
      .from(facturasClientes)
      .where(eq(facturasClientes.id, id))
      .limit(1);

    return jsonResponse({ success: true, data: updatedFactura });
  } catch (error: any) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ success: false, error: error.message ?? "Internal error" }, { status: 500 });
  }
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const [factura] = await db
      .select({
        id: facturasClientes.id,
        numeroFactura: facturasClientes.numeroFactura,
        fechaFactura: facturasClientes.fechaFactura,
        fechaVencimiento: facturasClientes.fechaVencimiento,
        subtotal: facturasClientes.subtotal,
        descuento: facturasClientes.descuento,
        itbis: facturasClientes.itbis,
        total: facturasClientes.total,
        estado: facturasClientes.estado,
        observaciones: facturasClientes.observaciones,
      })
      .from(facturasClientes)
      .where(eq(facturasClientes.id, id))
      .limit(1);

    if (!factura) {
      return NextResponse.json({ success: false, error: "Factura no encontrada" }, { status: 404 });
    }

    return jsonResponse({ success: true, data: factura });
  } catch (error: any) {
    console.error("Error getting invoice:", error);
    return NextResponse.json({ success: false, error: error.message ?? "Internal error" }, { status: 500 });
  }
}