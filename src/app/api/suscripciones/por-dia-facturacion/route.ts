import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";

import { successResponse, errorResponse } from "@/lib/api-response";
import { db } from "@/lib/db";

/**
 * GET /api/suscripciones/por-dia-facturacion
 * Obtiene suscripciones activas filtradas por día de facturación
 * Query params:
 *  - diaFacturacion: number (1-31)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const diaFacturacion = searchParams.get("diaFacturacion");

    if (!diaFacturacion) {
      return errorResponse("El parámetro diaFacturacion es requerido", 400);
    }

    const dia = parseInt(diaFacturacion);
    if (isNaN(dia) || dia < 1 || dia > 31) {
      return errorResponse("El día de facturación debe estar entre 1 y 31", 400);
    }

    // Consulta optimizada con todas las relaciones necesarias
    const suscripciones = await db.execute(sql`
      SELECT 
        s.id,
        s.numero_contrato,
        s.fecha_inicio,
        s.fecha_vencimiento,
        s.estado,
        s.precio_mensual,
        s.descuento_aplicado,
        s.fecha_proximo_pago,
        s.dia_facturacion,
        
        -- Datos del cliente
        c.id as cliente_id,
        c.codigo_cliente,
        c.nombre as cliente_nombre,
        c.apellidos as cliente_apellidos,
        c.email as cliente_email,
        c.telefono as cliente_telefono,
        c.direccion as cliente_direccion,
        
        -- Datos del servicio
        srv.id as servicio_id,
        srv.nombre as servicio_nombre,
        srv.descripcion as servicio_descripcion,
        srv.tipo as servicio_tipo,
        
        -- Datos del plan (si existe)
        p.id as plan_id,
        p.nombre as plan_nombre,
        p.descripcion as plan_descripcion,
        p.subida_kbps,
        p.bajada_mbps
        
      FROM suscripciones s
      INNER JOIN clientes c ON s.cliente_id = c.id
      LEFT JOIN servicios srv ON s.servicio_id = srv.id
      LEFT JOIN planes p ON s.plan_id = p.id
      
      WHERE s.dia_facturacion = ${dia}
        AND s.estado = 'activo'
        AND c.estado = 'activo'
      
      ORDER BY c.nombre, c.apellidos
    `);

    return successResponse({
      suscripciones: suscripciones.rows,
      total: suscripciones.rows.length,
    });
  } catch (error: any) {
    console.error("Error al obtener suscripciones:", error);
    return errorResponse("Error al obtener suscripciones: " + error.message, 500);
  }
}
