/* eslint-disable complexity */

import { NextRequest } from "next/server";

import { eq, sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { CommonErrors, errorResponse, successResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { servicios, suscripciones, historialSuscripciones, usuarios } from "@/lib/db/schema";
import { validateRequest } from "@/lib/validation";
import { updateSuscripcionSchema } from "@/schemas/suscripcion.schema";

function getIdFromPath(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Error desconocido";
}

async function getPlanPrice(planId: number): Promise<string | null> {
  const planResult = await db.execute(sql`
    SELECT precio
    FROM planes
    WHERE id = ${BigInt(planId)}
    LIMIT 1
  `);

  const row = planResult.rows[0] as { precio?: string } | undefined;
  return row?.precio ?? null;
}

async function getPlanDetails(planId: number | string | bigint): Promise<{ nombre: string; precio: string } | null> {
  const planResult = await db.execute(sql`
    SELECT nombre, precio
    FROM planes
    WHERE id = ${BigInt(planId)}
    LIMIT 1
  `);

  const row = planResult.rows[0] as { nombre?: string; precio?: string } | undefined;
  if (!row?.nombre || !row?.precio) return null;

  return {
    nombre: row.nombre,
    precio: row.precio,
  };
}

async function getServicioPrice(servicioId: string): Promise<string | null> {
  const serviceRows = await db
    .select({ id: servicios.id, precioBase: servicios.precioBase })
    .from(servicios)
    .where(eq(servicios.id, servicioId))
    .limit(1);

  if (serviceRows.length === 0) return null;
  return serviceRows[0].precioBase;
}

async function getServicioDetails(servicioId: string): Promise<{ nombre: string; precio: string } | null> {
  const serviceRows = await db
    .select({ id: servicios.id, nombre: servicios.nombre, precioBase: servicios.precioBase })
    .from(servicios)
    .where(eq(servicios.id, servicioId))
    .limit(1);

  if (serviceRows.length === 0) return null;

  return {
    nombre: serviceRows[0].nombre,
    precio: serviceRows[0].precioBase,
  };
}

export const PATCH = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const id = getIdFromPath(req.nextUrl.pathname);
      if (!id) {
        return errorResponse("ID de suscripcion invalido", 400);
      }

      const body = await req.json();
      const { data: validatedData, error } = await validateRequest(body, updateSuscripcionSchema);
      if (error || !validatedData) {
        return error ?? CommonErrors.badRequest("Datos invalidos");
      }

      const hasFields = Object.keys(validatedData).length > 0;
      if (!hasFields) {
        return errorResponse("No se enviaron cambios para actualizar", 400);
      }

      const existingRows = await db
        .select({
          id: suscripciones.id,
          planId: suscripciones.planId,
          servicioId: suscripciones.servicioId,
          precioMensual: suscripciones.precioMensual,
          estado: suscripciones.estado,
        })
        .from(suscripciones)
        .where(eq(suscripciones.id, id))
        .limit(1);

      if (existingRows.length === 0) {
        return CommonErrors.notFound("Suscripcion");
      }
      const existingSubscription = existingRows[0];

      let selectedPlanPrice: string | null = null;
      let selectedPlanName: string | null = null;
      let selectedServicePrice: string | null = null;
      let selectedServiceName: string | null = null;

      if (validatedData.planId !== undefined && validatedData.planId !== null) {
        const selectedPlan = await getPlanDetails(validatedData.planId);
        selectedPlanPrice = selectedPlan?.precio ?? null;
        selectedPlanName = selectedPlan?.nombre ?? null;
        if (!selectedPlanPrice || !selectedPlanName) {
          return errorResponse("El plan seleccionado no existe", 400);
        }
      }

      if (validatedData.servicioId !== undefined && validatedData.servicioId !== null) {
        const selectedService = await getServicioDetails(validatedData.servicioId);
        selectedServicePrice = selectedService?.precio ?? null;
        selectedServiceName = selectedService?.nombre ?? null;
        if (!selectedServicePrice || !selectedServiceName) {
          return errorResponse("El servicio seleccionado no existe", 400);
        }
      }

      let nextPrecioMensual = validatedData.precioMensual;
      if (nextPrecioMensual === undefined) {
        if (validatedData.planId !== undefined && validatedData.planId !== null) {
          nextPrecioMensual = selectedPlanPrice ?? existingSubscription.precioMensual;
        } else if (validatedData.servicioId !== undefined && validatedData.servicioId !== null) {
          nextPrecioMensual = selectedServicePrice ?? existingSubscription.precioMensual;
        }
      }

      const updatePayload: Record<string, unknown> = {
        updatedAt: sql`CURRENT_TIMESTAMP`,
      };

      if (validatedData.servicioId !== undefined) updatePayload.servicioId = validatedData.servicioId;
      if (validatedData.planId !== undefined) updatePayload.planId = validatedData.planId;
      if (validatedData.estado !== undefined) updatePayload.estado = validatedData.estado;
      if (validatedData.descuentoAplicado !== undefined) {
        updatePayload.descuentoAplicado = validatedData.descuentoAplicado;
      }
      if (validatedData.diaFacturacion !== undefined) updatePayload.diaFacturacion = validatedData.diaFacturacion;
      if (validatedData.fechaProximoPago !== undefined) updatePayload.fechaProximoPago = validatedData.fechaProximoPago;
      if (validatedData.fechaVencimiento !== undefined) updatePayload.fechaVencimiento = validatedData.fechaVencimiento;
      if (validatedData.notasInstalacion !== undefined) updatePayload.notasInstalacion = validatedData.notasInstalacion;
      if (validatedData.notasServicio !== undefined) updatePayload.notasServicio = validatedData.notasServicio;
      if (nextPrecioMensual !== undefined) updatePayload.precioMensual = nextPrecioMensual;

      const historyTableCheck = await db.execute(sql`
        SELECT to_regclass('public.historial_suscripciones') AS table_name
      `);
      const historyTableExists = Boolean((historyTableCheck.rows[0] as { table_name?: string | null } | undefined)?.table_name);

      const actorRows = await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(eq(usuarios.id, user.id))
        .limit(1);
      const actorUserId = actorRows[0]?.id ?? null;

      const existingPlan = existingSubscription.planId != null
        ? await getPlanDetails(existingSubscription.planId)
        : null;
      const existingService = existingSubscription.servicioId
        ? await getServicioDetails(existingSubscription.servicioId)
        : null;

      const changes = [];
      
      if (validatedData.servicioId !== undefined && validatedData.servicioId !== existingSubscription.servicioId) {
        changes.push({
          tipoCambio: "SERVICIO",
          valorAnterior: existingService?.nombre || "NINGUNO",
          valorNuevo: selectedServiceName || "NINGUNO",
        });
      }

      if (validatedData.planId !== undefined && validatedData.planId !== existingSubscription.planId) {
        changes.push({
          tipoCambio: "PLAN",
          valorAnterior: existingPlan?.nombre || "NINGUNO",
          valorNuevo: selectedPlanName || "NINGUNO",
        });
      }

      if (nextPrecioMensual !== undefined && nextPrecioMensual !== existingSubscription.precioMensual) {
        changes.push({
          tipoCambio: "PRECIO",
          valorAnterior: existingSubscription.precioMensual,
          valorNuevo: nextPrecioMensual,
        });
      }

      if (validatedData.estado !== undefined && validatedData.estado !== existingSubscription.estado) {
        changes.push({
          tipoCambio: "ESTADO",
          valorAnterior: existingSubscription.estado,
          valorNuevo: validatedData.estado,
        });
      }

      const [updatedSubscription] = await db
        .update(suscripciones)
        .set(updatePayload)
        .where(eq(suscripciones.id, id))
        .returning();

      if (historyTableExists && changes.length > 0) {
        try {
          await db.insert(historialSuscripciones).values(
            changes.map(changeObj => ({
              suscripcionId: id,
              usuarioId: actorUserId,
              ...changeObj,
            }))
          );
        } catch (historyError: unknown) {
          if (historyError && typeof historyError === "object") {
            const err = historyError as {
              code?: string;
              detail?: string;
              constraint?: string;
              table?: string;
              schema?: string;
              where?: string;
              message?: string;
            };
            console.warn("No se pudo registrar historial_suscripciones:", {
              code: err.code,
              detail: err.detail,
              constraint: err.constraint,
              table: err.table,
              schema: err.schema,
              where: err.where,
              message: err.message,
            });
          } else {
            console.warn("No se pudo registrar historial_suscripciones:", historyError);
          }
        }
      } else if (!historyTableExists && changes.length > 0) {
        console.warn("Se omite historial de suscripciones porque la tabla historial_suscripciones no existe en la BD local.");
      }

      return successResponse(
        JSON.parse(
          JSON.stringify(
            {
              suscripcion: updatedSubscription,
              message: "Suscripcion actualizada correctamente",
            },
            (key, value) => (typeof value === "bigint" ? value.toString() : value),
          ),
        ),
      );
    } catch (error: unknown) {
      console.error("Error al actualizar suscripcion:", error);
      return errorResponse(`Error al actualizar la suscripcion: ${getErrorMessage(error)}`, 500);
    }
  },
  { requiredPermission: "clientes:editar" },
);
