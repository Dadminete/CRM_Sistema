import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { facturasClientes, cuentasPorCobrar, clientes, suscripciones, contratos } from "@/lib/db/schema";
import { eq, and, or, sql, asc, gte, lte } from "drizzle-orm";
import { jsonResponse } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const billingDay = searchParams.get("billingDay");
    const clienteId = searchParams.get("clienteId");

    console.log('[PENDIENTES] Fetching pending invoices...');
    console.log('[PENDIENTES] Filters:', { startDate, endDate, billingDay, clienteId });

    const subquerySuscripciones = db
      .select({
        clienteId: suscripciones.clienteId,
        diaFacturacion: sql<number>`min(${suscripciones.diaFacturacion})`.as("dia_facturacion"),
      })
      .from(suscripciones)
      .groupBy(suscripciones.clienteId)
      .as("s");

    let conditions = or(
      eq(facturasClientes.estado, "pendiente"),
      eq(facturasClientes.estado, "parcial"),
      eq(facturasClientes.estado, "pago parcial"),
      eq(facturasClientes.estado, "adelantado"),
    );

    if (startDate && endDate) {
      conditions = and(
        conditions,
        gte(facturasClientes.fechaFactura, startDate),
        lte(facturasClientes.fechaFactura, endDate),
      );
    } else if (startDate) {
      conditions = and(conditions, gte(facturasClientes.fechaFactura, startDate));
    } else if (endDate) {
      conditions = and(conditions, lte(facturasClientes.fechaFactura, endDate));
    }

    if (billingDay) {
      conditions = and(conditions, eq(subquerySuscripciones.diaFacturacion, parseInt(billingDay)));
    }

    if (clienteId) {
      conditions = and(conditions, eq(clientes.id, clienteId));
    }

    const pendientes = await db
      .select({
        id: facturasClientes.id,
        numeroFactura: facturasClientes.numeroFactura,
        fechaFactura: facturasClientes.fechaFactura,
        fechaVencimiento: facturasClientes.fechaVencimiento,
        total: facturasClientes.total,
        estado: facturasClientes.estado,
        montoPendiente: cuentasPorCobrar.montoPendiente,
        clienteId: clientes.id,
        clienteNombre: clientes.nombre,
        clienteApellidos: clientes.apellidos,
        clienteEmail: clientes.email,
        clienteTelefono: clientes.telefono,
        diaFacturacion: subquerySuscripciones.diaFacturacion,
        fotoUrl: clientes.fotoUrl,
      })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .innerJoin(clientes, eq(cuentasPorCobrar.clienteId, clientes.id))
      .leftJoin(subquerySuscripciones, eq(facturasClientes.clienteId, subquerySuscripciones.clienteId))
      .where(conditions)
      .orderBy(asc(clientes.nombre));

    console.log(`[PENDIENTES] Found ${pendientes.length} pending invoices`);
    if (pendientes.length > 0) {
      console.log('[PENDIENTES] First 3:', pendientes.slice(0, 3).map(f => f.numeroFactura));
    }

    return jsonResponse({
      success: true,
      data: pendientes,
    });
  } catch (error: any) {
    console.error("Error fetching pending invoices:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
