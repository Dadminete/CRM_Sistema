import { NextRequest } from "next/server";

import { and, eq, sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { CommonErrors, errorResponse, successResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { clientes, equiposCliente, suscripciones } from "@/lib/db/schema";
import { createEquipoSchema, normalizeMacAddress } from "@/schemas/equipo.schema";

function toNullable(value?: string | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Error desconocido";
}

function normalizeIpv4(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  const withoutCidr = cleaned.replace(/\/\d+$/, "");
  const parts = withoutCidr.split(".");
  if (parts.length !== 4) return null;
  const isValid = parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255;
  });
  return isValid ? withoutCidr : null;
}

function normalizeUuid(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const cleaned = String(value).trim();
  return cleaned.length ? cleaned : null;
}

function normalizeString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const cleaned = String(value).trim();
  return cleaned.length ? cleaned : null;
}

function normalizeMac(value: unknown): string | null | undefined {
  return normalizeMacAddress(value);
}

export const PATCH = withAuth(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      if (!id) return CommonErrors.badRequest("ID de equipo requerido");

      const body = await req.json();
      const normalizedBody = {
        ...body,
        clienteId: normalizeUuid(body?.clienteId),
        suscripcionId: normalizeUuid(body?.suscripcionId),
        macAddress: normalizeMac(body?.macAddress),
        ipAsignada: normalizeIpv4(body?.ipAsignada),
        ubicacion: normalizeString(body?.ubicacion),
        notas: normalizeString(body?.notas),
      };

      const parsed = createEquipoSchema.safeParse(normalizedBody);
      if (!parsed.success) {
        return CommonErrors.validationError(parsed.error.flatten());
      }

      const validatedData = parsed.data;

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

      const existingRows = await db
        .select({ id: equiposCliente.id, clienteId: equiposCliente.clienteId })
        .from(equiposCliente)
        .where(eq(equiposCliente.id, id))
        .limit(1);

      if (existingRows.length === 0) {
        return CommonErrors.notFound("Equipo");
      }

      const existing = existingRows[0];
      if (existing.clienteId !== validatedData.clienteId) {
        return errorResponse("El equipo no pertenece al cliente indicado", 400);
      }

      const [updatedEquipment] = await db
        .update(equiposCliente)
        .set({
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
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(and(eq(equiposCliente.id, id), eq(equiposCliente.clienteId, validatedData.clienteId)))
        .returning();

      return successResponse({ equipo: updatedEquipment, message: "Equipo actualizado correctamente" });
    } catch (error: unknown) {
      console.error("Error al actualizar equipo:", error);

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

      return errorResponse(`Error al actualizar equipo: ${getErrorMessage(error)}`, 500);
    }
  },
  { requiredPermission: "clientes:editar" },
);

export const DELETE = withAuth(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      if (!id) return CommonErrors.badRequest("ID de equipo requerido");

      const existingRows = await db
        .select({ id: equiposCliente.id })
        .from(equiposCliente)
        .where(eq(equiposCliente.id, id))
        .limit(1);

      if (existingRows.length === 0) {
        return CommonErrors.notFound("Equipo");
      }

      await db.delete(equiposCliente).where(eq(equiposCliente.id, id));

      return successResponse({ message: "Equipo eliminado correctamente" });
    } catch (error: unknown) {
      console.error("Error al eliminar equipo:", error);
      return errorResponse(`Error al eliminar equipo: ${getErrorMessage(error)}`, 500);
    }
  },
  { requiredPermission: "clientes:editar" },
);
