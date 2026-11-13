import { withAuth } from "@/lib/api-auth";
import { CommonErrors, errorResponse, successResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { configuraciones } from "@/lib/db/schema";
import { paymentReminderSchema } from "@/lib/payment-reminder";
import { getPaymentReminder, PAYMENT_REMINDER_CONFIG_KEY } from "@/lib/payment-reminder-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return successResponse(await getPaymentReminder());
  } catch (error) {
    console.error("Error cargando el recordatorio de pago:", error);
    return CommonErrors.internalError("No se pudo cargar la información de pago.");
  }
}

export const PUT = withAuth(
  async (request) => {
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).origin !== request.nextUrl.origin) {
          return errorResponse("Origen no permitido.", 403);
        }
      } catch {
        return errorResponse("Origen no permitido.", 403);
      }
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return CommonErrors.badRequest("El cuerpo de la solicitud no es válido.");
    }

    const parsed = paymentReminderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Revisa los datos del recordatorio e inténtalo de nuevo.", 400, parsed.error.flatten());
    }

    const reminder = parsed.data;
    const serialized = JSON.stringify(reminder);

    try {
      await db
        .insert(configuraciones)
        .values({
          clave: PAYMENT_REMINDER_CONFIG_KEY,
          valor: serialized,
          descripcion: "Texto y cuentas bancarias del recordatorio de pago público",
          tipo: "json",
          esPublica: true,
          categoria: "pagos",
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: configuraciones.clave,
          set: {
            valor: serialized,
            descripcion: "Texto y cuentas bancarias del recordatorio de pago público",
            tipo: "json",
            esPublica: true,
            categoria: "pagos",
            updatedAt: new Date().toISOString(),
          },
        });

      return successResponse(reminder);
    } catch (error) {
      console.error("Error guardando el recordatorio de pago:", error);
      return CommonErrors.internalError("No se pudieron guardar los cambios.");
    }
  },
  { requiredPermission: "configuracion_sistema" },
);
