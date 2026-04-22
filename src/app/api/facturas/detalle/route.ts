import { NextResponse } from "next/server";
import { sql, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { facturasClientes, clientes, detalleFacturas, cuentasPorCobrar, pagosClientes, usuarios } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

type SuscripcionConPlan = {
  plan_nombre: string | null;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });
    }

    const factura = await db
      .select({
        id: facturasClientes.id,
        numeroFactura: facturasClientes.numeroFactura,
        fechaFactura: facturasClientes.fechaFactura,
        fechaVencimiento: facturasClientes.fechaVencimiento,
        total: facturasClientes.total,
        subtotal: facturasClientes.subtotal,
        itbis: facturasClientes.itbis,
        descuento: facturasClientes.descuento,
        estado: facturasClientes.estado,
        observaciones: facturasClientes.observaciones,
        periodoFacturadoInicio: facturasClientes.periodoFacturadoInicio,
        periodoFacturadoFin: facturasClientes.periodoFacturadoFin,
        clienteId: clientes.id,
        clienteNombre: clientes.nombre,
        clienteApellidos: clientes.apellidos,
        clienteRnc: clientes.cedula,
        clienteTelefono: clientes.telefono,
        clienteEmail: clientes.email,
        clienteDireccion: clientes.direccion,
        montoPendiente: cuentasPorCobrar.montoPendiente,
        diasVencido: cuentasPorCobrar.diasVencido,
      })
      .from(facturasClientes)
      .innerJoin(clientes, eq(facturasClientes.clienteId, clientes.id))
      .leftJoin(cuentasPorCobrar, eq(facturasClientes.id, cuentasPorCobrar.facturaId))
      .where(eq(facturasClientes.id, id))
      .limit(1);

    if (factura.length === 0) {
      return NextResponse.json({ success: false, error: "Factura no encontrada" }, { status: 404 });
    }

    const payments = await db
      .select({
        id: pagosClientes.id,
        facturaId: pagosClientes.facturaId,
        fechaPago: pagosClientes.fechaPago,
        monto: pagosClientes.monto,
        metodoPago: pagosClientes.metodoPago,
        numeroReferencia: pagosClientes.numeroReferencia,
        recibidoPor: pagosClientes.recibidoPor,
        estado: pagosClientes.estado,
        observaciones: pagosClientes.observaciones,
        createdAt: pagosClientes.createdAt,
        recibidoPorNombre: sql<string>`CONCAT(${usuarios.nombre}, ' ', ${usuarios.apellido})`.as("recibido_por_nombre"),
      })
      .from(pagosClientes)
      .leftJoin(usuarios, and(eq(pagosClientes.recibidoPor, usuarios.id), eq(usuarios.activo, true)))
      .where(eq(pagosClientes.facturaId, id))
      .orderBy(desc(pagosClientes.fechaPago));

    const items = await db
      .select()
      .from(detalleFacturas)
      .where(eq(detalleFacturas.facturaId, id))
      .orderBy(detalleFacturas.orden);

    const servicioIdPrincipal = items.find((item) => Boolean(item?.servicioId))?.servicioId;

    let planNombre: string | null = null;

    if (servicioIdPrincipal) {
      const planPorServicio = await db.execute(sql`
        SELECT p.nombre AS plan_nombre
        FROM suscripciones s
        LEFT JOIN planes p ON p.id = s.plan_id
        WHERE s.cliente_id = ${factura[0].clienteId}
          AND s.estado = 'activo'
          AND s.servicio_id = ${servicioIdPrincipal}
        ORDER BY s.fecha_inicio DESC
        LIMIT 1
      `);

      planNombre = ((planPorServicio.rows[0] as SuscripcionConPlan | undefined)?.plan_nombre ?? null) as string | null;
    }

    if (!planNombre) {
      const planGeneral = await db.execute(sql`
        SELECT p.nombre AS plan_nombre
        FROM suscripciones s
        LEFT JOIN planes p ON p.id = s.plan_id
        WHERE s.cliente_id = ${factura[0].clienteId}
          AND s.estado = 'activo'
        ORDER BY s.fecha_inicio DESC
        LIMIT 1
      `);

      planNombre = ((planGeneral.rows[0] as SuscripcionConPlan | undefined)?.plan_nombre ?? null) as string | null;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...factura[0],
        planNombre,
        items,
        payments,
      },
    });
  } catch (error: any) {
    console.error("Error fetching factura detail:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
