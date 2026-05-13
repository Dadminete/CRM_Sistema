import { NextResponse } from "next/server";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { clientes, facturasClientes, pagosClientes } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clienteId = searchParams.get("clienteId");
  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;
  const startOfNextYear = `${currentYear + 1}-01-01`;

  if (!clienteId) {
    return NextResponse.json({ success: false, error: "clienteId requerido" }, { status: 400 });
  }

  try {
    const [clienteInfo] = await db
      .select({ nombre: clientes.nombre, apellidos: clientes.apellidos, email: clientes.email })
      .from(clientes)
      .where(eq(clientes.id, clienteId));

    const pagos = await db
      .select({
        pagoId: pagosClientes.id,
        numeroPago: pagosClientes.numeroPago,
        fechaPago: pagosClientes.fechaPago,
        monto: pagosClientes.monto,
        metodoPago: pagosClientes.metodoPago,
        numeroReferencia: pagosClientes.numeroReferencia,
        estadoPago: pagosClientes.estado,
        facturaId: facturasClientes.id,
        numeroFactura: facturasClientes.numeroFactura,
        fechaFactura: facturasClientes.fechaFactura,
        totalFactura: facturasClientes.total,
        estadoFactura: facturasClientes.estado,
        diasDiferencia: sql<number>`(${pagosClientes.fechaPago}::date - ${facturasClientes.fechaFactura}::date)::int`,
      })
      .from(pagosClientes)
      .innerJoin(facturasClientes, eq(pagosClientes.facturaId, facturasClientes.id))
      .where(
        and(
          eq(pagosClientes.clienteId, clienteId),
          eq(pagosClientes.estado, "confirmado"),
          sql`${pagosClientes.fechaPago} >= ${startOfYear}`,
          sql`${pagosClientes.fechaPago} < ${startOfNextYear}`,
        ),
      )
      .orderBy(desc(pagosClientes.fechaPago));

    return NextResponse.json({ success: true, cliente: clienteInfo || null, pagos });
  } catch (error) {
    console.error("[historial GET]", error);
    return NextResponse.json({ success: false, error: "Error al obtener historial" }, { status: 500 });
  }
}
