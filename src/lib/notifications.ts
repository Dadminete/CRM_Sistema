import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

import { logger } from "./logger";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "FACTURA" | "APROBACION" | "STOCK";

export interface CreateNotificationOptions {
  usuarioId: string;
  tipo: NotificationType;
  titulo: string;
  mensaje: string;
  enlace?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a notification for a user
 *
 * Note: This requires the 'notificaciones' table to exist in the database.
 * Run the migration to create the table if it doesn't exist.
 *
 * Table structure:
 * CREATE TABLE notificaciones (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 *   tipo VARCHAR(20) NOT NULL,
 *   titulo VARCHAR(255) NOT NULL,
 *   mensaje TEXT NOT NULL,
 *   enlace VARCHAR(255),
 *   metadata JSONB,
 *   leida BOOLEAN DEFAULT FALSE,
 *   fecha_creacion TIMESTAMP DEFAULT NOW(),
 *   fecha_leida TIMESTAMP
 * );
 */
export async function createNotification(options: CreateNotificationOptions): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace, metadata, leida)
      VALUES (
        ${options.usuarioId},
        ${options.tipo},
        ${options.titulo},
        ${options.mensaje},
        ${options.enlace || null},
        ${options.metadata ? JSON.stringify(options.metadata) : null},
        false
      )
    `);
  } catch (error) {
    logger.error("Failed to create notification", error, { notification: options });
    // Don't throw - notifications are not critical
  }
}

/**
 * Create notification for multiple users
 */
export async function createBulkNotifications(
  usuarioIds: string[],
  notification: Omit<CreateNotificationOptions, "usuarioId">,
): Promise<void> {
  const promises = usuarioIds.map((usuarioId) => createNotification({ ...notification, usuarioId }));

  await Promise.allSettled(promises);
}

/**
 * Helper functions for common notification types
 */

export async function notifyNewInvoice(usuarioId: string, numeroFactura: string, clienteNombre: string): Promise<void> {
  await createNotification({
    usuarioId,
    tipo: "FACTURA",
    titulo: "Nueva Factura Asignada",
    mensaje: `Se te ha asignado la factura ${numeroFactura} para el cliente ${clienteNombre}`,
    enlace: `/dashboard/facturas/${numeroFactura}`,
    metadata: { numeroFactura, clienteNombre },
  });
}

export async function notifyInvoiceDueSoon(
  usuarioId: string,
  numeroFactura: string,
  diasRestantes: number,
): Promise<void> {
  await createNotification({
    usuarioId,
    tipo: "WARNING",
    titulo: "Factura Próxima a Vencer",
    mensaje: `La factura ${numeroFactura} vence en ${diasRestantes} día${diasRestantes !== 1 ? "s" : ""}`,
    enlace: `/dashboard/facturas/${numeroFactura}`,
    metadata: { numeroFactura, diasRestantes },
  });
}

export async function notifyApprovalRequired(
  usuarioId: string,
  tipo: string,
  descripcion: string,
  enlace: string,
): Promise<void> {
  await createNotification({
    usuarioId,
    tipo: "APROBACION",
    titulo: "Aprobación Pendiente",
    mensaje: `Se requiere tu aprobación para: ${descripcion}`,
    enlace,
    metadata: { tipo, descripcion },
  });
}

export async function notifyLowStock(
  usuarioIds: string[],
  productoNombre: string,
  stockActual: number,
  stockMinimo: number,
): Promise<void> {
  await createBulkNotifications(usuarioIds, {
    tipo: "STOCK",
    titulo: "Stock Bajo",
    mensaje: `El producto "${productoNombre}" tiene stock bajo (${stockActual}/${stockMinimo})`,
    enlace: "/dashboard/productos",
    metadata: { productoNombre, stockActual, stockMinimo },
  });
}

export async function notifyPermissionChange(usuarioId: string, cambio: string): Promise<void> {
  await createNotification({
    usuarioId,
    tipo: "INFO",
    titulo: "Cambios en tus Permisos",
    mensaje: `Tus permisos de usuario han sido actualizados: ${cambio}`,
    enlace: "/dashboard/profile",
    metadata: { cambio },
  });
}
