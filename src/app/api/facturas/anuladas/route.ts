import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientes, facturasClientes, pagosClientes } from "@/lib/db/schema";
import { desc, eq, ilike, or, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type EstadoFiltro = "todas" | "anuladas" | "canceladas";

function parseEstadoFiltro(raw: string | null): EstadoFiltro {
  if (raw === "anuladas") return "anuladas";
  if (raw === "canceladas") return "canceladas";
  return "todas";
}

function getEstadoCondition(estadoFiltro: EstadoFiltro) {
  const anuladas = or(ilike(facturasClientes.estado, "anulada"), ilike(facturasClientes.estado, "anulado"));
  const canceladas = or(
    ilike(facturasClientes.estado, "cancelada"),
    ilike(facturasClientes.estado, "cancelado"),
  );

  if (estadoFiltro === "anuladas") return anuladas;
  if (estadoFiltro === "canceladas") return canceladas;

  return or(anuladas, canceladas);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const estadoFiltro = parseEstadoFiltro(searchParams.get("estado"));

    const lastPaymentSubquery = db
      .select({
        facturaId: pagosClientes.facturaId,
        fechaPago: sql<string>`MAX(${pagosClientes.fechaPago})`.as("fecha_pago"),
        metodoPago: sql<string>`MAX(${pagosClientes.metodoPago})`.as("metodo_pago"),
        totalPagado: sql<string>`SUM(${pagosClientes.monto})`.as("total_pagado"),
      })
      .from(pagosClientes)
      .groupBy(pagosClientes.facturaId)
      .as("ultimo_pago");

    const facturas = await db
      .select({
        id: facturasClientes.id,
        numeroFactura: facturasClientes.numeroFactura,
        fechaFactura: facturasClientes.fechaFactura,
        fechaVencimiento: facturasClientes.fechaVencimiento,
        total: facturasClientes.total,
        estado: facturasClientes.estado,
        subtotal: facturasClientes.subtotal,
        descuento: facturasClientes.descuento,
        itbis: facturasClientes.itbis,
        updatedAt: facturasClientes.updatedAt,
        clienteId: clientes.id,
        clienteNombre: clientes.nombre,
        clienteApellidos: clientes.apellidos,
        clienteEmail: clientes.email,
        clienteTelefono: clientes.telefono,
        fechaPago: lastPaymentSubquery.fechaPago,
        metodoPago: lastPaymentSubquery.metodoPago,
        totalPagado: lastPaymentSubquery.totalPagado,
      })
      .from(facturasClientes)
      .innerJoin(clientes, eq(facturasClientes.clienteId, clientes.id))
      .leftJoin(lastPaymentSubquery, eq(facturasClientes.id, lastPaymentSubquery.facturaId))
      .where(getEstadoCondition(estadoFiltro))
      .orderBy(desc(facturasClientes.fechaFactura));

    return NextResponse.json({
      success: true,
      data: facturas,
    });
  } catch (error: any) {
    console.error("Error fetching annulled/canceled invoices:", error);
    return NextResponse.json({ success: false, error: error.message ?? "Internal error" }, { status: 500 });
  }
}