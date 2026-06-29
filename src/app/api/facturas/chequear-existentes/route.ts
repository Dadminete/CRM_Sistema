import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";

import { successResponse, errorResponse } from "@/lib/api-response";
import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { calcularCantidadPeriodosAdelantados, resolverPeriodoBaseAdelantado } from "@/app/api/facturas/lib/periodos";

interface SuscripcionInfo {
  suscripcion_id: string;
  numero_contrato: string;
  cliente_id: string;
  servicio_id: string;
  cliente_nombre: string;
  cliente_apellidos: string;
  servicio_nombre: string;
}

interface PeriodInfo {
  mes: number;
  anio: number;
  periodoInicioIso: string;
  periodoFinIso: string;
}

function getPeriodList(
  mesInicio: number,
  anioInicio: number,
  cantidadPeriodos: number,
): PeriodInfo[] {
  const periodos: PeriodInfo[] = [];
  for (let offset = 0; offset < cantidadPeriodos; offset++) {
    const base = new Date(anioInicio, mesInicio - 1 + offset, 1);
    const mes = base.getMonth() + 1;
    const anio = base.getFullYear();

    const periodoInicio = new Date(anio, mes - 1, 1);
    const periodoFin = new Date(anio, mes, 0);

    periodos.push({
      mes,
      anio,
      periodoInicioIso: periodoInicio.toISOString().split("T")[0],
      periodoFinIso: periodoFin.toISOString().split("T")[0],
    });
  }
  return periodos;
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const {
      suscripcionIds,
      mesPeriodo,
      anioPeriodo,
      pagoAdelantado = false,
      mesesAdelantados,
      pagoAdelantadoUnMes = false,
      mesAdelantado,
      anioAdelantado,
    } = body;

    if (!suscripcionIds || !Array.isArray(suscripcionIds) || suscripcionIds.length === 0) {
      return errorResponse("Debe seleccionar al menos una suscripción", 400);
    }

    if (!mesPeriodo || mesPeriodo < 1 || mesPeriodo > 12) {
      return errorResponse("El mes debe estar entre 1 y 12", 400);
    }

    if (!anioPeriodo || anioPeriodo < 2000) {
      return errorResponse("El año es inválido", 400);
    }

    const isLegacyAdvanceMode = Boolean(pagoAdelantadoUnMes) && typeof mesesAdelantados === "undefined";
    const pagoAdelantadoHabilitado = Boolean(pagoAdelantado) || Boolean(pagoAdelantadoUnMes);

    let mesesAdelantadosNormalizado = Number(mesesAdelantados ?? 0);
    if (isLegacyAdvanceMode) {
      mesesAdelantadosNormalizado = 0;
    }

    const { mes: mesInicio, anio: anioInicio } = resolverPeriodoBaseAdelantado({
      pagoAdelantadoHabilitado,
      mesPeriodo,
      anioPeriodo,
      mesAdelantado,
      anioAdelantado,
      isLegacyAdvanceMode,
    });

    const cantidadPeriodos = pagoAdelantadoHabilitado ? calcularCantidadPeriodosAdelantados(mesesAdelantadosNormalizado) : 1;
    const targetPeriodos = getPeriodList(mesInicio, anioInicio, cantidadPeriodos);

    // Obtener información de suscripciones clientes y servicios
    const suscripciones = await db.execute(sql`
      SELECT 
        s.id as suscripcion_id, s.numero_contrato, s.cliente_id, s.servicio_id,
        c.nombre as cliente_nombre, c.apellidos as cliente_apellidos,
        srv.nombre as servicio_nombre
      FROM suscripciones s
      INNER JOIN clientes c ON s.cliente_id = c.id
      LEFT JOIN servicios srv ON s.servicio_id = srv.id
      WHERE s.id IN (${sql.join(suscripcionIds.map((id: string) => sql`${id}`), sql`, `)}) 
        AND s.estado = 'activo'
    `);

    const suscripcionesTyped = suscripciones.rows as unknown as SuscripcionInfo[];

    if (suscripcionesTyped.length === 0) {
      return successResponse({ conflicts: [] });
    }

    // Obtener lista única de clientes
    const clientesUnicos = [...new Set(suscripcionesTyped.map((s) => s.cliente_id))];

    // Buscar facturas existentes para estos clientes
    const facturasExistentes = await db.execute(sql`
      SELECT 
        fc.id, fc.numero_factura, fc.cliente_id, fc.estado, 
        fc.periodo_facturado_inicio, fc.periodo_facturado_fin,
        df.servicio_id
      FROM facturas_clientes fc
      INNER JOIN detalle_facturas df ON df.factura_id = fc.id
      WHERE fc.cliente_id IN (${sql.join(clientesUnicos.map((id) => sql`${id}`), sql`, `)})
    `);

    interface FacturaExistente {
      id: string;
      numero_factura: string;
      cliente_id: string;
      estado: string;
      periodo_facturado_inicio: string;
      periodo_facturado_fin: string;
      servicio_id: string;
    }

    const facturasTyped = facturasExistentes.rows as unknown as FacturaExistente[];

    const conflicts = [];

    // Mapear y buscar coincidencias en memoria
    for (const suscripcion of suscripcionesTyped) {
      for (const periodo of targetPeriodos) {
        const matchingInvoice = facturasTyped.find(
          (factura) =>
            factura.cliente_id === suscripcion.cliente_id &&
            factura.servicio_id === suscripcion.servicio_id &&
            factura.periodo_facturado_inicio === periodo.periodoInicioIso &&
            factura.periodo_facturado_fin === periodo.periodoFinIso,
        );

        if (matchingInvoice) {
          conflicts.push({
            suscripcionId: suscripcion.suscripcion_id,
            numeroContrato: suscripcion.numero_contrato,
            clienteNombre: `${suscripcion.cliente_nombre} ${suscripcion.cliente_apellidos}`,
            servicioNombre: suscripcion.servicio_nombre || "Servicio",
            mes: periodo.mes,
            anio: periodo.anio,
            invoiceId: matchingInvoice.id,
            numeroFactura: matchingInvoice.numero_factura,
            estado: matchingInvoice.estado,
          });
        }
      }
    }

    return successResponse({ conflicts });
  } catch (error: any) {
    console.error("Error al chequear facturas existentes:", error);
    return errorResponse("Error al chequear facturas: " + error.message, 500);
  }
});
