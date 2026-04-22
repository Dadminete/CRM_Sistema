import { NextRequest } from "next/server";
import { and, or, eq, ilike, sql, asc } from "drizzle-orm";

import { successResponse, errorResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { suscripciones, clientes, servicios, planes } from "@/lib/db/schema";

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
    const search = searchParams.get("search") || "";

    if (!diaFacturacion && !search) {
      return errorResponse("Se requiere diaFacturacion o un término de búsqueda", 400);
    }

    let dia = null;
    if (diaFacturacion) {
      dia = parseInt(diaFacturacion);
      if (isNaN(dia) || dia < 1 || dia > 31) {
        return errorResponse("El día de facturación debe estar entre 1 y 31", 400);
      }
    }

    // Consulta optimizada con el query builder de Drizzle
    const whereConditions = [];

    // Filtro por día de facturación si se proporciona
    if (dia !== null) {
      whereConditions.push(eq(suscripciones.diaFacturacion, dia));
    }

    // Filtro por estado activo (tanto suscripción como cliente)
    // Usamos sql para COALESCE y LOWER para mantener la lógica original de limpieza de datos
    whereConditions.push(eq(sql`LOWER(COALESCE(${suscripciones.estado}, ''))`, "activo"));
    whereConditions.push(eq(sql`LOWER(COALESCE(${clientes.estado}, ''))`, "activo"));

    // Filtro de búsqueda
    if (search) {
      whereConditions.push(
        or(
          ilike(clientes.nombre, `%${search}%`),
          ilike(clientes.apellidos, `%${search}%`),
          ilike(clientes.codigoCliente, `%${search}%`),
          ilike(suscripciones.numeroContrato, `%${search}%`)
        )
      );
    }

    const data = await db
      .select({
        id: suscripciones.id,
        numero_contrato: suscripciones.numeroContrato,
        fecha_inicio: suscripciones.fechaInicio,
        fecha_vencimiento: suscripciones.fechaVencimiento,
        estado: suscripciones.estado,
        precio_mensual: suscripciones.precioMensual,
        descuento_aplicado: suscripciones.descuentoAplicado,
        fecha_proximo_pago: suscripciones.fechaProximoPago,
        dia_facturacion: suscripciones.diaFacturacion,
        
        // Datos del cliente
        cliente_id: clientes.id,
        codigo_cliente: clientes.codigoCliente,
        cliente_nombre: clientes.nombre,
        cliente_apellidos: clientes.apellidos,
        cliente_email: clientes.email,
        cliente_telefono: clientes.telefono,
        cliente_direccion: clientes.direccion,
        
        // Datos del servicio
        servicio_id: servicios.id,
        servicio_nombre: servicios.nombre,
        servicio_descripcion: servicios.descripcion,
        servicio_tipo: servicios.tipo,
        
        // Datos del plan (si existe)
        plan_id: planes.id,
        plan_nombre: planes.nombre,
        plan_descripcion: planes.descripcion,
        subida_kbps: planes.subidaKbps,
        bajada_mbps: planes.bajadaMbps,
      })
      .from(suscripciones)
      .innerJoin(clientes, eq(suscripciones.clienteId, clientes.id))
      .leftJoin(servicios, eq(suscripciones.servicioId, servicios.id))
      .leftJoin(planes, eq(suscripciones.planId, planes.id))
      .where(and(...whereConditions))
      .orderBy(asc(clientes.nombre), asc(clientes.apellidos))
      .limit(100);

    return successResponse({
      suscripciones: data,
      total: data.length,
    });
  } catch (error: any) {
    console.error("Error al obtener suscripciones:", error);
    return errorResponse("Error al obtener suscripciones: " + (error.message || "Error desconocido"), 500);
  }
}
