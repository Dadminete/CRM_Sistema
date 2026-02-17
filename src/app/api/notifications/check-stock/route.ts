import { NextRequest } from "next/server";
import { sql, and, lte } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { productosPapeleria, usuariosRoles, rolesPermisos, permisos } from "@/lib/db/schema";
import { notifyLowStock } from "@/lib/notifications";

/**
 * Check low stock products and send notifications
 * This endpoint should be called periodically (e.g., daily cron job)
 *
 * GET /api/notifications/check-stock
 */
export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      // Find products with stock below minimum
      const lowStockProducts = await db
        .select({
          id: productosPapeleria.id,
          nombre: productosPapeleria.nombre,
          codigo: productosPapeleria.codigo,
          stockActual: productosPapeleria.stockActual,
          stockMinimo: productosPapeleria.stockMinimo,
        })
        .from(productosPapeleria)
        .where(
          and(
            sql`${productosPapeleria.stockActual} <= ${productosPapeleria.stockMinimo}`,
            sql`${productosPapeleria.activo} = true`,
          ),
        );

      if (lowStockProducts.length === 0) {
        return successResponse({
          message: "No hay productos con stock bajo",
          count: 0,
        });
      }

      // Find users with inventory management permission
      const usersWithInventoryPermission = await db
        .select({
          usuarioId: usuariosRoles.usuarioId,
        })
        .from(usuariosRoles)
        .innerJoin(rolesPermisos, sql`${usuariosRoles.rolId} = ${rolesPermisos.rolId}`)
        .innerJoin(permisos, sql`${rolesPermisos.permisoId} = ${permisos.id}`)
        .where(
          and(
            sql`${permisos.nombrePermiso} = 'productos:leer'`,
            sql`${usuariosRoles.activo} = true`,
            sql`${rolesPermisos.activo} = true`,
          ),
        )
        .groupBy(usuariosRoles.usuarioId);

      const userIds = usersWithInventoryPermission.map((u) => u.usuarioId);

      // Send notifications for each low stock product
      const notificationPromises = lowStockProducts.map((product) =>
        notifyLowStock(userIds, product.nombre, Number(product.stockActual), Number(product.stockMinimo)),
      );

      await Promise.allSettled(notificationPromises);

      return successResponse({
        message: "Notificaciones de stock bajo enviadas",
        productsChecked: lowStockProducts.length,
        usersNotified: userIds.length,
        products: lowStockProducts.map((p) => ({
          nombre: p.nombre,
          codigo: p.codigo,
          stockActual: p.stockActual,
          stockMinimo: p.stockMinimo,
        })),
      });
    } catch (error: any) {
      console.error("Error checking low stock:", error);
      return CommonErrors.internalError("Error al verificar stock bajo");
    }
  },
  { requiredPermission: "productos:leer" },
);
