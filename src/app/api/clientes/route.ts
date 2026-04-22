import { NextRequest } from "next/server";
import { eq, inArray, sql, or, ilike, and, exists } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, errorResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { clientes, planes, servicios, suscripciones } from "@/lib/db/schema";
import { getPaginationParams, getPaginationOffset, getTotalCount, createPaginatedData } from "@/lib/pagination";
import { validateRequest } from "@/lib/validation";
import { createClienteSchema, type CreateClienteInput } from "@/schemas/cliente.schema";

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

function mapSexo(value: CreateClienteInput["sexo"]): "MASCULINO" | "FEMENINO" | null {
  if (value === "M") return "MASCULINO";
  if (value === "F") return "FEMENINO";
  return null;
}

function mapCreateClienteToDb(input: CreateClienteInput) {
  const coords = parseCoordinates(input.coordenadas);

  return {
    codigoCliente: input.codigoCliente.trim(),
    nombre: input.nombre.trim(),
    apellidos: input.apellidos.trim(),
    cedula: toNullable(input.cedula),
    telefono: toNullable(input.telefono),
    telefonoSecundario: toNullable(input.celular),
    email: toNullable(input.email),
    direccion: toNullable(input.direccion),
    sectorBarrio: toNullable(input.sector),
    ciudad: toNullable(input.ciudad),
    provincia: toNullable(input.provincia),
    codigoPostal: toNullable(input.codigoPostal),
    coordenadasLat: coords.lat,
    coordenadasLng: coords.lng,
    tipoCliente: input.tipoCliente ?? "residencial",
    categoriaCliente: input.categoria ?? "NUEVO",
    limiteCrediticio: input.limiteCredito ?? "0",
    creditoDisponible: input.limiteCredito ?? "0",
    diasCredito: input.diasCredito ?? 0,
    descuentoPorcentaje: input.descuentoCliente ?? "0",
    sexo: mapSexo(input.sexo),
    fotoUrl: toNullable(input.fotoUrl),
    notas: toNullable(input.observaciones),
  };
}

function getDateOnly(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function parsePlanId(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

async function generateNumeroContrato(tx: any): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `SUS-${year}${month}-`;

  const last = await tx.execute(
    sql`SELECT numero_contrato FROM suscripciones WHERE numero_contrato LIKE ${prefix + "%"} ORDER BY numero_contrato DESC LIMIT 1`,
  );
  const lastNum = (last.rows?.[0] as { numero_contrato?: string } | undefined)?.numero_contrato;
  const seq = lastNum ? Number.parseInt(lastNum.slice(-5), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, "0")}`;
}

async function createClientSubscriptions(tx: any, input: CreateClienteInput, clienteId: string, usuarioId: string) {
  const planId = parsePlanId(input.planId);
  const uniqueServicioIds = Array.from(new Set((input.servicioIds ?? []).filter(Boolean)));
  const today = getDateOnly();

  if (!planId && uniqueServicioIds.length === 0) {
    return [] as string[];
  }

  let selectedPlan: { id: number; precio: string | null } | null = null;
  if (planId) {
    const planRows = await tx
      .select({ id: planes.id, precio: planes.precio })
      .from(planes)
      .where(eq(planes.id, planId))
      .limit(1);

    if (!planRows.length) {
      throw new Error("PLAN_NOT_FOUND");
    }

    selectedPlan = {
      id: Number(planRows[0].id),
      precio: planRows[0].precio,
    };
  }

  const selectedServices = uniqueServicioIds.length
    ? await tx
        .select({ id: servicios.id, precioBase: servicios.precioBase })
        .from(servicios)
        .where(inArray(servicios.id, uniqueServicioIds))
    : [];

  if (selectedServices.length !== uniqueServicioIds.length) {
    throw new Error("SERVICIO_NOT_FOUND");
  }

  const createdSubscriptions: string[] = [];

  if (selectedPlan) {
    const numeroContrato = await generateNumeroContrato(tx);
    const [subscription] = await tx
      .insert(suscripciones)
      .values({
        clienteId,
        planId: selectedPlan.id,
        usuarioId,
        numeroContrato,
        fechaInicio: today,
        estado: "activo",
        precioMensual: selectedPlan.precio ?? "0",
        descuentoAplicado: "0",
        fechaProximoPago: today,
        diaFacturacion: 1,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .returning({ id: suscripciones.id });

    createdSubscriptions.push(subscription.id);
  }

  for (const service of selectedServices) {
    const numeroContrato = await generateNumeroContrato(tx);
    const [subscription] = await tx
      .insert(suscripciones)
      .values({
        clienteId,
        servicioId: service.id,
        usuarioId,
        numeroContrato,
        fechaInicio: today,
        estado: "activo",
        precioMensual: service.precioBase ?? "0",
        descuentoAplicado: "0",
        fechaProximoPago: today,
        diaFacturacion: 1,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .returning({ id: suscripciones.id });

    createdSubscriptions.push(subscription.id);
  }

  return createdSubscriptions;
}

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      // Get pagination parameters
      const { page, limit, sortBy, sortOrder } = getPaginationParams(req);
      const offset = getPaginationOffset(page, limit);

      // Get search parameter
      const search = req.nextUrl.searchParams.get("search") || "";

      // Build where clause
      let whereClause: SQL | undefined = undefined;
      if (search) {
        whereClause = or(
          ilike(clientes.nombre, `%${search}%`),
          ilike(clientes.apellidos, `%${search}%`),
          ilike(clientes.codigoCliente, `%${search}%`),
          ilike(clientes.cedula, `%${search}%`),
          ilike(clientes.email, `%${search}%`)
        );
      }

      // Get total count with search filter
      const total = await getTotalCount(clientes, whereClause);

      // Fetch paginated clients
      // Fetch paginated clients
      const orderColumn =
        sortBy === "nombre" ? clientes.nombre : sortBy === "codigoCliente" ? clientes.codigoCliente : clientes.createdAt;
      
        const allClients = await db
          .select({
            id: clientes.id,
            // ... (all columns)
            usuarioId: clientes.usuarioId,
            codigoCliente: clientes.codigoCliente,
            cedula: clientes.cedula,
            nombre: clientes.nombre,
            apellidos: clientes.apellidos,
            telefono: clientes.telefono,
            telefonoSecundario: clientes.telefonoSecundario,
            email: clientes.email,
            direccion: clientes.direccion,
            sectorBarrio: clientes.sectorBarrio,
            ciudad: clientes.ciudad,
            provincia: clientes.provincia,
            codigoPostal: clientes.codigoPostal,
            coordenadasLat: clientes.coordenadasLat,
            coordenadasLng: clientes.coordenadasLng,
            fechaSuscripcion: clientes.fechaSuscripcion,
            sexo: clientes.sexo,
            fotoUrl: clientes.fotoUrl,
            contacto: clientes.contacto,
            contactoEmergencia: clientes.contactoEmergencia,
            telefonoEmergencia: clientes.telefonoEmergencia,
            referenciaDireccion: clientes.referenciaDireccion,
            tipoCliente: clientes.tipoCliente,
            categoriaCliente: clientes.categoriaCliente,
            estado: clientes.estado,
            limiteCrediticio: clientes.limiteCrediticio,
            creditoDisponible: clientes.creditoDisponible,
            diasCredito: clientes.diasCredito,
            descuentoPorcentaje: clientes.descuentoPorcentaje,
            notas: clientes.notas,
            referidoPor: clientes.referidoPor,
            fechaIngreso: clientes.fechaIngreso,
            createdAt: clientes.createdAt,
            updatedAt: clientes.updatedAt,
            tieneSuscripcionActiva: exists(
              db.select({ id: suscripciones.id })
                .from(suscripciones)
                .where(
                  and(
                    eq(suscripciones.clienteId, clientes.id),
                    eq(suscripciones.estado, 'activo')
                  )
                )
            ).as("tieneSuscripcionActiva"),
          })
          .from(clientes)
          .where(whereClause)
        .orderBy(sortOrder === "asc" ? sql`${orderColumn} ASC` : sql`${orderColumn} DESC`)
        .limit(limit)
        .offset(offset);

      // Query separada para obtener precio_mensual de suscripciones activas por cliente
      const preciosResult = await db.execute(sql`
        SELECT cliente_id, SUM(CAST(precio_mensual AS NUMERIC)) AS precio_mensual
        FROM suscripciones
        WHERE estado = 'activo'
        GROUP BY cliente_id
      `);
      const preciosPorCliente = new Map<string, string>();
      for (const row of preciosResult.rows as { cliente_id: string; precio_mensual: string }[]) {
        preciosPorCliente.set(row.cliente_id, row.precio_mensual);
      }

      const clientsWithPrices = allClients.map((c) => ({
        ...c,
        montoMensual: preciosPorCliente.get(c.id) ?? "0",
      }));

      const serializedClients = JSON.parse(
        JSON.stringify(clientsWithPrices, (key, value) => (typeof value === "bigint" ? value.toString() : value)),
      );

      return successResponse(createPaginatedData(serializedClients, page, limit, total));
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      return CommonErrors.internalError("Error al obtener clientes");
    }
  },
  { requiredPermission: "clientes:leer" },
);

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json();

      // Validate request body
      const { data: validatedData, error } = await validateRequest(body, createClienteSchema);
      if (error) return error;

      const result = await db.transaction(async (tx) => {
        const [newClient] = await tx
          .insert(clientes)
          .values({
            ...mapCreateClienteToDb(validatedData),
            createdAt: sql`CURRENT_TIMESTAMP`,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .returning();

        const subscriptionIds = await createClientSubscriptions(tx, validatedData, newClient.id, user.id);
        return { client: newClient, subscriptionIds };
      });

      return successResponse(
        {
          client: result.client,
          subscriptionsCreated: result.subscriptionIds.length,
          subscriptionIds: result.subscriptionIds,
        },
        undefined,
        201,
      );
    } catch (error: any) {
      console.error("Error creating client:", error);

      if (error?.message === "PLAN_NOT_FOUND") {
        return errorResponse("El plan seleccionado no existe", 400);
      }

      if (error?.message === "SERVICIO_NOT_FOUND") {
        return errorResponse("Uno o mas servicios adicionales no existen", 400);
      }

      if (error.code === "23505") {
        const detail = typeof error.detail === "string" ? error.detail : "";
        if (detail.includes("cedula")) {
          return errorResponse("La cédula ya existe", 409);
        }
        if (detail.includes("numero_contrato")) {
          return errorResponse("Conflicto generando numero de contrato, intenta nuevamente", 409);
        }
        return errorResponse("El código de cliente ya existe", 409);
      }
      return CommonErrors.internalError("Error al crear cliente");
    }
  },
  { requiredPermission: "clientes:crear" },
);
