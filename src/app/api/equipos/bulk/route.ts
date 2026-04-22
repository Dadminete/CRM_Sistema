/* eslint-disable complexity, max-depth, security/detect-object-injection */

import { NextRequest } from "next/server";

import { eq, sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { CommonErrors, errorResponse, successResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { clientes, equiposCliente, suscripciones } from "@/lib/db/schema";
import { validateRequest } from "@/lib/validation";
import { createEquiposBulkSchema, normalizeMacAddress } from "@/schemas/equipo.schema";

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

export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const normalizedBody = {
        ...body,
        clienteId: normalizeUuid(body?.clienteId),
        equipos: Array.isArray(body?.equipos)
          ? body.equipos.map((equipment: Record<string, unknown>) => ({
              ...equipment,
              suscripcionId: normalizeUuid(equipment?.suscripcionId),
              macAddress: normalizeMacAddress(equipment?.macAddress),
              ipAsignada: normalizeIpv4(equipment?.ipAsignada),
              ubicacion: normalizeString(equipment?.ubicacion),
              notas: normalizeString(equipment?.notas),
            }))
          : body?.equipos,
      };

      const { data: validatedData, error } = await validateRequest(normalizedBody, createEquiposBulkSchema);
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

      const serieSet = new Set<string>();
      const macSet = new Set<string>();

      const created: Array<{ index: number; id: string; numeroSerie: string }> = [];
      const failed: Array<{ index: number; numeroSerie: string; error: string }> = [];

      for (let i = 0; i < validatedData.equipos.length; i += 1) {
        const equipment = validatedData.equipos[i];
        const serieKey = equipment.numeroSerie.trim().toLowerCase();

        if (serieSet.has(serieKey)) {
          failed.push({
            index: i,
            numeroSerie: equipment.numeroSerie,
            error: "Numero de serie duplicado en la misma carga",
          });
          continue;
        }
        serieSet.add(serieKey);

        if (equipment.macAddress) {
          const macKey = equipment.macAddress.trim().toLowerCase();
          if (macSet.has(macKey)) {
            failed.push({
              index: i,
              numeroSerie: equipment.numeroSerie,
              error: "Direccion MAC duplicada en la misma carga",
            });
            continue;
          }
          macSet.add(macKey);
        }

        try {
          if (equipment.suscripcionId) {
            const subscriptionRows = await db
              .select({ id: suscripciones.id, clienteId: suscripciones.clienteId })
              .from(suscripciones)
              .where(eq(suscripciones.id, equipment.suscripcionId))
              .limit(1);

            if (subscriptionRows.length === 0) {
              failed.push({
                index: i,
                numeroSerie: equipment.numeroSerie,
                error: "La suscripcion indicada no existe",
              });
              continue;
            }

            const subscription = subscriptionRows[0];

            if (subscription.clienteId !== validatedData.clienteId) {
              failed.push({
                index: i,
                numeroSerie: equipment.numeroSerie,
                error: "La suscripcion no pertenece al cliente",
              });
              continue;
            }
          }

          const [inserted] = await db
            .insert(equiposCliente)
            .values({
              clienteId: validatedData.clienteId,
              suscripcionId: equipment.suscripcionId ?? null,
              tipoEquipo: equipment.tipoEquipo.trim(),
              marca: equipment.marca.trim(),
              modelo: equipment.modelo.trim(),
              numeroSerie: equipment.numeroSerie.trim(),
              macAddress: toNullable(equipment.macAddress),
              ipAsignada: toNullable(equipment.ipAsignada),
              estado: toNullable(equipment.estado) ?? "instalado",
              fechaInstalacion: equipment.fechaInstalacion ?? null,
              fechaRetiro: equipment.fechaRetiro ?? null,
              ubicacion: toNullable(equipment.ubicacion),
              notas: toNullable(equipment.notas),
              createdAt: sql`CURRENT_TIMESTAMP`,
              updatedAt: sql`CURRENT_TIMESTAMP`,
            })
            .returning({ id: equiposCliente.id, numeroSerie: equiposCliente.numeroSerie });

          created.push({ index: i, id: inserted.id, numeroSerie: inserted.numeroSerie });
        } catch (insertError: unknown) {
          const insertErr = insertError as { code?: string; detail?: string };
          if (insertErr.code === "23505") {
            const detail = typeof insertErr.detail === "string" ? insertErr.detail : "";
            if (detail.includes("numero_serie")) {
              failed.push({ index: i, numeroSerie: equipment.numeroSerie, error: "Numero de serie ya registrado" });
              continue;
            }
            if (detail.includes("mac_address")) {
              failed.push({ index: i, numeroSerie: equipment.numeroSerie, error: "Direccion MAC ya registrada" });
              continue;
            }
          }

          failed.push({
            index: i,
            numeroSerie: equipment.numeroSerie,
            error: "No se pudo registrar el equipo",
          });
        }
      }

      return successResponse(
        {
          total: validatedData.equipos.length,
          createdCount: created.length,
          failedCount: failed.length,
          created,
          failed,
        },
        undefined,
        created.length > 0 ? 201 : 200,
      );
    } catch (error: unknown) {
      console.error("Error en carga masiva de equipos:", error);
      return errorResponse(`Error en la carga masiva de equipos: ${getErrorMessage(error)}`, 500);
    }
  },
  { requiredPermission: "clientes:editar" },
);
