/* eslint-disable complexity */

import { NextRequest } from "next/server";

import { and, desc, eq, sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { CommonErrors, errorResponse, successResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { clientes, equiposCliente, suscripciones } from "@/lib/db/schema";
import { validateRequest } from "@/lib/validation";
import { createEquipoSchema } from "@/schemas/equipo.schema";

function toNullable(value?: string | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Error desconocido";
}

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const clienteId = searchParams.get("clienteId");
      const suscripcionId = searchParams.get("suscripcionId");

      if (!clienteId && !suscripcionId) {
        return errorResponse("Debes enviar clienteId o suscripcionId", 400);
      }

      const conditions = [];
      if (clienteId) conditions.push(eq(equiposCliente.clienteId, clienteId));
      if (suscripcionId) conditions.push(eq(equiposCliente.suscripcionId, suscripcionId));

      const rows = await db
        .select({
          id: equiposCliente.id,
          clienteId: equiposCliente.clienteId,
          suscripcionId: equiposCliente.suscripcionId,
          tipoEquipo: equiposCliente.tipoEquipo,
          marca: equiposCliente.marca,
          modelo: equiposCliente.modelo,
          numeroSerie: equiposCliente.numeroSerie,
          macAddress: equiposCliente.macAddress,
          ipAsignada: equiposCliente.ipAsignada,
          estado: equiposCliente.estado,
          fechaInstalacion: equiposCliente.fechaInstalacion,
          fechaRetiro: equiposCliente.fechaRetiro,
          ubicacion: equiposCliente.ubicacion,
          notas: equiposCliente.notas,
          createdAt: equiposCliente.createdAt,
          updatedAt: equiposCliente.updatedAt,
          numeroContrato: suscripciones.numeroContrato,
        })
        .from(equiposCliente)
        .leftJoin(suscripciones, eq(equiposCliente.suscripcionId, suscripciones.id))
        .where(conditions.length > 1 ? and(...conditions) : conditions[0])
        .orderBy(desc(equiposCliente.createdAt));

      return successResponse({ equipos: rows, total: rows.length });
    } catch (error: unknown) {
      console.error("Error al listar equipos:", error);
      return errorResponse(`Error al listar equipos: ${getErrorMessage(error)}`, 500);
    }
  },
  { requiredPermission: "clientes:leer" },
);

export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const { data: validatedData, error } = await validateRequest(body, createEquipoSchema);
      if (error || !validatedData) {
        return error ?? CommonErrors.badRequest("Datos invalidos");
      }

      const clientRows = await db
        .select({ id: clientes.id })
        .from(clientes)
        .where(eq(clientes.id, validatedData.clienteId))
        .limit(1);

      if (clientRows.length === 0) {
        return CommonErrors.notFound("Cliente");
      }

      if (validatedData.suscripcionId) {
        const subscriptionRows = await db
          .select({ id: suscripciones.id, clienteId: suscripciones.clienteId })
          .from(suscripciones)
          .where(eq(suscripciones.id, validatedData.suscripcionId))
          .limit(1);

        if (subscriptionRows.length === 0) {
          return CommonErrors.notFound("Suscripcion");
        }

        const subscription = subscriptionRows[0];

        if (subscription.clienteId !== validatedData.clienteId) {
          return errorResponse("La suscripcion no pertenece al cliente indicado", 400);
        }
      }

      const [newEquipment] = await db
        .insert(equiposCliente)
        .values({
          clienteId: validatedData.clienteId,
          suscripcionId: validatedData.suscripcionId ?? null,
          tipoEquipo: validatedData.tipoEquipo.trim(),
          marca: validatedData.marca.trim(),
          modelo: validatedData.modelo.trim(),
          numeroSerie: validatedData.numeroSerie.trim(),
          macAddress: toNullable(validatedData.macAddress),
          ipAsignada: toNullable(validatedData.ipAsignada),
          estado: toNullable(validatedData.estado) ?? "instalado",
          fechaInstalacion: validatedData.fechaInstalacion ?? null,
          fechaRetiro: validatedData.fechaRetiro ?? null,
          ubicacion: toNullable(validatedData.ubicacion),
          notas: toNullable(validatedData.notas),
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .returning();

      return successResponse({ equipo: newEquipment, message: "Equipo registrado correctamente" }, undefined, 201);
    } catch (error: unknown) {
      console.error("Error al registrar equipo:", error);

      const err = error as { code?: string; detail?: string };
      if (err.code === "23505") {
        const detail = typeof err.detail === "string" ? err.detail : "";
        if (detail.includes("numero_serie")) {
          return errorResponse("El numero de serie ya existe", 409);
        }
        if (detail.includes("mac_address")) {
          return errorResponse("La direccion MAC ya existe", 409);
        }
      }

      return errorResponse(`Error al registrar equipo: ${getErrorMessage(error)}`, 500);
    }
  },
  { requiredPermission: "clientes:editar" },
);
