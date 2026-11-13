import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { configuraciones } from "@/lib/db/schema";
import { DEFAULT_PAYMENT_REMINDER, paymentReminderSchema } from "@/lib/payment-reminder";

export const PAYMENT_REMINDER_CONFIG_KEY = "recordatorio_pago";

export async function getPaymentReminder() {
  const configs = await db
    .select({ valor: configuraciones.valor })
    .from(configuraciones)
    .where(eq(configuraciones.clave, PAYMENT_REMINDER_CONFIG_KEY))
    .limit(1);
  const config = configs.at(0);

  if (!config) return DEFAULT_PAYMENT_REMINDER;

  let storedValue: unknown;
  try {
    storedValue = JSON.parse(config.valor);
  } catch (error) {
    console.error("La configuración del recordatorio de pago no contiene JSON válido.", error);
    throw new Error("No se pudo cargar la información de pago.");
  }

  const result = paymentReminderSchema.safeParse(storedValue);
  if (!result.success) {
    console.error("La configuración del recordatorio de pago no es válida.", result.error.flatten());
    throw new Error("La información de pago guardada no es válida.");
  }

  return result.data;
}
