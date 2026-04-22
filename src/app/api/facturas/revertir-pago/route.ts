import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";

import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  cajas,
  cuentasPorCobrar,
  facturasClientes,
  movimientosContables,
  pagosClientes,
  roles,
  usuariosRoles,
} from "@/lib/db/schema";
import { jsonResponse } from "@/lib/serializers";

const revertPaymentSchema = z.object({
  facturaId: z.string().uuid(),
  motivo: z.string().max(500).optional(),
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const payload = await req.json();
    const parsed = revertPaymentSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonResponse(
        { success: false, error: parsed.error.issues[0]?.message ?? "Payload inválido" },
        { status: 400 },
      );
    }

    const { facturaId, motivo } = parsed.data;

    // Revertir pagos es una operación sensible; solo admins.
    const adminRows = await db
      .select({ nombreRol: roles.nombreRol })
      .from(usuariosRoles)
      .innerJoin(roles, eq(usuariosRoles.rolId, roles.id))
      .where(and(eq(usuariosRoles.usuarioId, user.id), eq(usuariosRoles.activo, true)))
      .limit(1);

    const esAdmin = adminRows.length > 0 && adminRows[0].nombreRol.toLowerCase().includes("admin");

    if (!esAdmin) {
      return jsonResponse(
        { success: false, error: "No autorizado para revertir pagos." },
        { status: 403 },
      );
    }

    const [factura] = await db
      .select({
        id: facturasClientes.id,
        numeroFactura: facturasClientes.numeroFactura,
        estado: facturasClientes.estado,
        descuento: facturasClientes.descuento,
      })
      .from(facturasClientes)
      .where(eq(facturasClientes.id, facturaId))
      .limit(1);

    if (!factura) {
      return jsonResponse({ success: false, error: "Factura no encontrada." }, { status: 404 });
    }

    const cxc = await db
      .select({
        id: cuentasPorCobrar.id,
        montoOriginal: cuentasPorCobrar.montoOriginal,
      })
      .from(cuentasPorCobrar)
      .where(eq(cuentasPorCobrar.facturaId, facturaId))
      .limit(1);

    if (cxc.length === 0) {
      return jsonResponse(
        { success: false, error: "La factura no tiene cuenta por cobrar asociada." },
        { status: 404 },
      );
    }

    const pagos = await db
      .select({
        id: pagosClientes.id,
        numeroPago: pagosClientes.numeroPago,
        monto: pagosClientes.monto,
        descuento: pagosClientes.descuento,
        metodoPago: pagosClientes.metodoPago,
        cajaId: pagosClientes.cajaId,
      })
      .from(pagosClientes)
      .where(eq(pagosClientes.facturaId, facturaId))
      .orderBy(desc(pagosClientes.createdAt));

    if (pagos.length === 0) {
      return jsonResponse(
        { success: false, error: "No hay pagos para revertir en esta factura." },
        { status: 400 },
      );
    }

    const totalDescuentosAplicados = pagos.reduce((acc, p) => acc + Number(p.descuento || 0), 0);

    await db.transaction(async (tx) => {
      // 1) Revertir movimientos de caja en efectivo.
      for (const pago of pagos) {
        const montoPago = Number(pago.monto || 0);
        if (pago.metodoPago === "efectivo" && pago.cajaId && montoPago > 0) {
          await tx
            .update(cajas)
            .set({ saldoActual: sql`${cajas.saldoActual} - ${montoPago}` })
            .where(eq(cajas.id, pago.cajaId));
        }
      }

      // 2) Borrar movimientos contables asociados a esos pagos.
      for (const pago of pagos) {
        await tx
          .delete(movimientosContables)
          .where(
            and(
              eq(movimientosContables.tipo, "ingreso"),
              ilike(movimientosContables.descripcion, `Pago de factura ${pago.numeroPago}%`),
            ),
          );
      }

      // 3) Borrar registros de pago.
      await tx.delete(pagosClientes).where(eq(pagosClientes.facturaId, facturaId));

      // 4) Restaurar CxC a pendiente total.
      const montoOriginal = Number(cxc[0].montoOriginal || 0);
      await tx
        .update(cuentasPorCobrar)
        .set({
          montoPendiente: montoOriginal.toFixed(2),
          estado: "pendiente",
          observaciones: motivo
            ? sql`
              CASE
                WHEN COALESCE(${cuentasPorCobrar.observaciones}, '') = '' THEN ${`REVERSADO: ${motivo}`}
                ELSE ${cuentasPorCobrar.observaciones} || ${` | REVERSADO: ${motivo}`}
              END
            `
            : cuentasPorCobrar.observaciones,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(cuentasPorCobrar.id, cxc[0].id));

      // 5) Restaurar factura a pendiente y ajustar descuento acumulado por pagos.
      const descuentoActualFactura = Number(factura.descuento || 0);
      const descuentoRestaurado = Math.max(0, descuentoActualFactura - totalDescuentosAplicados);

      await tx
        .update(facturasClientes)
        .set({
          estado: "pendiente",
          descuento: descuentoRestaurado.toFixed(2),
          observaciones: motivo
            ? sql`
              CASE
                WHEN COALESCE(${facturasClientes.observaciones}, '') = '' THEN ${`REVERSADO: ${motivo}`}
                ELSE ${facturasClientes.observaciones} || ${` | REVERSADO: ${motivo}`}
              END
            `
            : facturasClientes.observaciones,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(facturasClientes.id, facturaId));
    });

    return jsonResponse({
      success: true,
      data: {
        facturaId,
        numeroFactura: factura.numeroFactura,
        pagosRevertidos: pagos.length,
      },
    });
  } catch (error: any) {
    console.error("Error reverting payment:", error);
    return NextResponse.json({ success: false, error: error.message ?? "Internal error" }, { status: 500 });
  }
});
