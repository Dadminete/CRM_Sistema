import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientes, facturasClientes, tickets, suscripciones, pagosClientes, usuarios, cuentasPorCobrar, historialSuscripciones, servicios, planes } from "@/lib/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";

function isNumericId(value: string | null | undefined): value is string {
  return Boolean(value && /^\d+$/.test(value));
}

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Fetch client basic info
    const [client] = await db.select().from(clientes).where(eq(clientes.id, id));

    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    // 2. Fetch invoices with payment details including who collected payment
    const invoices = await db
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
        // Keep pending amount reliable even if cuentas_por_cobrar row is missing.
        montoPendiente: sql<string>`COALESCE(
          ${cuentasPorCobrar.montoPendiente},
          GREATEST(
            ${facturasClientes.total} - COALESCE((
              SELECT SUM(COALESCE(p.monto, 0) + COALESCE(p.descuento, 0))
              FROM pagos_clientes p
              WHERE p.factura_id = ${facturasClientes.id}
            ), 0),
            0
          )
        )`.as("monto_pendiente"),
        // Explicit amount to show in payment cards (what is left to pay).
        montoParaPago: sql<string>`COALESCE(
          ${cuentasPorCobrar.montoPendiente},
          GREATEST(
            ${facturasClientes.total} - COALESCE((
              SELECT SUM(COALESCE(p.monto, 0) + COALESCE(p.descuento, 0))
              FROM pagos_clientes p
              WHERE p.factura_id = ${facturasClientes.id}
            ), 0),
            0
          )
        )`.as("monto_para_pago"),
        // Get the most recent payment info including who collected it
        ultimoMontoPagado: sql<string>`(
          SELECT monto FROM pagos_clientes 
          WHERE factura_id = ${facturasClientes.id} 
          ORDER BY created_at DESC LIMIT 1
        )`,
        ultimoMontoPagoFecha: sql<string>`(
          SELECT fecha_pago FROM pagos_clientes 
          WHERE factura_id = ${facturasClientes.id} 
          ORDER BY created_at DESC LIMIT 1
        )`,
        ultimoMetodoPago: sql<string>`(
          SELECT metodo_pago FROM pagos_clientes 
          WHERE factura_id = ${facturasClientes.id} 
          ORDER BY created_at DESC LIMIT 1
        )`,
        cobradoPor: sql<string>`(
          SELECT CONCAT(u.nombre, ' ', u.apellido) 
          FROM pagos_clientes p 
          INNER JOIN usuarios u ON p.recibido_por = u.id AND u.activo = true
          WHERE p.factura_id = ${facturasClientes.id} 
          ORDER BY p.created_at DESC LIMIT 1
        )`,
      })
      .from(facturasClientes)
      .leftJoin(cuentasPorCobrar, eq(facturasClientes.id, cuentasPorCobrar.facturaId))
      .where(eq(facturasClientes.clienteId, id))
      .orderBy(desc(facturasClientes.fechaFactura))
      .limit(10); // Limit to recent 10 for performance

    // 3. Fetch tickets (averías)
    const clientTickets = await db
      .select()
      .from(tickets)
      .where(eq(tickets.clienteId, id))
      .orderBy(desc(tickets.fechaCreacion))
      .limit(10);

    // 4. Fetch subscriptions with service/plan info
    const clientSubscriptions = await db
      .select({
        id: suscripciones.id,
        numeroContrato: suscripciones.numeroContrato,
        servicio: servicios.nombre,
        plan: planes.nombre,
        precioMensual: suscripciones.precioMensual,
        descuentoAplicado: suscripciones.descuentoAplicado,
        estado: suscripciones.estado,
        fechaInicio: suscripciones.fechaInicio,
        fechaProximoPago: suscripciones.fechaProximoPago,
      })
      .from(suscripciones)
      .leftJoin(servicios, eq(suscripciones.servicioId, servicios.id))
      .leftJoin(planes, eq(suscripciones.planId, planes.id))
      .where(eq(suscripciones.clienteId, id));

    // 5. Fetch subscription history (resilient to missing table)
    let history: any[] = [];
    try {
      const rawHistory = await db
        .select({
          id: historialSuscripciones.id,
          suscripcionId: historialSuscripciones.suscripcionId,
          tipoCambio: historialSuscripciones.tipoCambio,
          valorAnterior: historialSuscripciones.valorAnterior,
          valorNuevo: historialSuscripciones.valorNuevo,
          fecha: historialSuscripciones.fecha,
          usuario: sql<string>`CONCAT(${usuarios.nombre}, ' ', ${usuarios.apellido})`,
        })
        .from(historialSuscripciones)
        .leftJoin(usuarios, eq(historialSuscripciones.usuarioId, usuarios.id))
        .innerJoin(suscripciones, eq(historialSuscripciones.suscripcionId, suscripciones.id))
        .where(eq(suscripciones.clienteId, id))
        .orderBy(desc(historialSuscripciones.fecha));

      const planIds = Array.from(
        new Set(
          rawHistory
            .filter((item) => item.tipoCambio === "PLAN")
            .flatMap((item) => [item.valorAnterior, item.valorNuevo])
            .filter(isNumericId)
            .map((value) => BigInt(value)),
        ),
      );

      const serviceIds = Array.from(
        new Set(
          rawHistory
            .filter((item) => item.tipoCambio === "SERVICIO")
            .flatMap((item) => [item.valorAnterior, item.valorNuevo])
            .filter(isUuid),
        ),
      );

      const planNameMap = new Map<string, string>();
      if (planIds.length > 0) {
        const planRows = await db
          .select({ id: planes.id, nombre: planes.nombre })
          .from(planes)
          .where(sql`${planes.id} = ANY(ARRAY[${sql.join(planIds.map((planId) => sql`${planId}`), sql`, `)}]::bigint[])`);

        for (const plan of planRows) {
          planNameMap.set(plan.id.toString(), plan.nombre);
        }
      }

      const serviceNameMap = new Map<string, string>();
      if (serviceIds.length > 0) {
        const serviceRows = await db
          .select({ id: servicios.id, nombre: servicios.nombre })
          .from(servicios)
          .where(sql`${servicios.id} = ANY(ARRAY[${sql.join(serviceIds.map((serviceId) => sql`${serviceId}`), sql`, `)}]::uuid[])`);

        for (const service of serviceRows) {
          serviceNameMap.set(service.id, service.nombre);
        }
      }

      history = rawHistory.map((item) => {
        if (item.tipoCambio === "PLAN") {
          return {
            ...item,
            valorAnterior: planNameMap.get(item.valorAnterior ?? "") ?? item.valorAnterior,
            valorNuevo: planNameMap.get(item.valorNuevo ?? "") ?? item.valorNuevo,
          };
        }

        if (item.tipoCambio === "SERVICIO") {
          return {
            ...item,
            valorAnterior: serviceNameMap.get(item.valorAnterior ?? "") ?? item.valorAnterior,
            valorNuevo: serviceNameMap.get(item.valorNuevo ?? "") ?? item.valorNuevo,
          };
        }

        return item;
      });
    } catch (e) {
      console.warn("Could not fetch subscription history, table might be missing:", e);
    }

    // 6. Match Listado Maestro: monthly amount is the sum of active subscription prices.
    const montoMensual = clientSubscriptions
      .filter((subscription) => subscription.estado === "activo")
      .reduce((sum, subscription) => {
        return sum + parseFloat(subscription.precioMensual || "0");
      }, 0);

    return NextResponse.json(
      JSON.parse(
        JSON.stringify(
          {
            success: true,
            client: {
              ...client,
              montoTotal: montoMensual.toString(),
              montoMensual: montoMensual.toString(),
            },
            invoices,
            tickets: clientTickets,
            subscriptions: clientSubscriptions,
            history
          },
          (key, value) => (typeof value === "bigint" ? value.toString() : value),
        ),
      ),
    );
  } catch (error: any) {
    console.error("Error fetching client details:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function toNullable(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseCoordinates(coordinates: string | null | undefined): { lat: string | null; lng: string | null } {
  const value = toNullable(coordinates);
  if (!value) return { lat: null, lng: null };

  const [rawLat, rawLng] = value.split(",").map((part) => part.trim());
  if (!rawLat || !rawLng) return { lat: null, lng: null };

  if (Number.isNaN(Number(rawLat)) || Number.isNaN(Number(rawLng))) {
    return { lat: null, lng: null };
  }

  return { lat: rawLat, lng: rawLng };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const coords = body.coordenadas ? parseCoordinates(body.coordenadas) : null;

    const updateData: any = {
      nombre: body.nombre?.trim(),
      apellidos: body.apellidos?.trim(),
      cedula: toNullable(body.cedula),
      telefono: toNullable(body.telefono),
      telefonoSecundario: toNullable(body.telefonoSecundario),
      email: toNullable(body.email),
      direccion: toNullable(body.direccion),
      sectorBarrio: toNullable(body.sectorBarrio),
      ciudad: toNullable(body.ciudad),
      provincia: toNullable(body.provincia),
      codigoPostal: toNullable(body.codigoPostal),
      tipoCliente: body.tipoCliente,
      categoriaCliente: body.categoriaCliente,
      sexo: body.sexo,
      fotoUrl: toNullable(body.fotoUrl),
      notas: toNullable(body.notas),
      estado: body.estado,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    };

    if (coords) {
      updateData.coordenadasLat = coords.lat;
      updateData.coordenadasLng = coords.lng;
    }

    if (body.limiteCrediticio !== undefined) updateData.limiteCrediticio = body.limiteCrediticio.toString();
    if (body.diasCredito !== undefined) updateData.diasCredito = parseInt(body.diasCredito) || 0;
    if (body.descuentoPorcentaje !== undefined) updateData.descuentoPorcentaje = body.descuentoPorcentaje.toString();

    // Remove undefined fields
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const [updatedClient] = await db
      .update(clientes)
      .set(updateData)
      .where(eq(clientes.id, id))
      .returning();

    // Sync status with their active subscriptions if the status changed
    if (body.estado !== undefined) {
      // Check if they have at least one subscription
      const [existingSub] = await db
        .select({ id: suscripciones.id })
        .from(suscripciones)
        .where(eq(suscripciones.clienteId, id))
        .limit(1);

      if (existingSub) {
        // Update all their subscriptions to match the new status
        await db
          .update(suscripciones)
          .set({ estado: body.estado, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(suscripciones.clienteId, id));
      } else if (body.estado === "activo") {
        // If they have NO subscription and we are activating them, create a generic one
        // so they appear as "Activos" in the unified view.
        await db.insert(suscripciones).values({
          clienteId: id,
          numeroContrato: `CT-GEN-${id.slice(0, 8)}`,
          fechaInicio: new Date().toISOString().slice(0, 10),
          estado: "activo",
          precioMensual: "0",
          descuentoAplicado: "0",
          fechaProximoPago: new Date().toISOString().slice(0, 10),
          diaFacturacion: 1,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        });
      }
    }

    if (!updatedClient) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    return NextResponse.json(
      JSON.parse(
        JSON.stringify({ success: true, client: updatedClient }, (key, value) =>
          typeof value === "bigint" ? value.toString() : value,
        ),
      ),
    );
  } catch (error: any) {
    console.error("Error updating client:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await db.delete(clientes).where(eq(clientes.id, id));

    return NextResponse.json({ success: true, message: "Cliente eliminado" });
  } catch (error: any) {
    console.error("Error deleting client:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
