import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { facturasClientes, cuentasPorCobrar, clientes } from "@/lib/db/schema";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { jsonResponse } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const limit = parseInt(searchParams.get("limit") || "50");

    let conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(facturasClientes.numeroFactura, `%${search}%`),
          ilike(clientes.nombre, `%${search}%`),
          ilike(clientes.apellidos, `%${search}%`)
        )
      );
    }

    if (status) {
      // Handle status mappings to match DB values
      if (status === "pendiente") {
        conditions.push(eq(facturasClientes.estado, "pendiente"));
      } else if (status === "parcial") {
        conditions.push(or(eq(facturasClientes.estado, "parcial"), eq(facturasClientes.estado, "pago parcial")));
      } else if (status === "pagada") {
        conditions.push(or(eq(facturasClientes.estado, "pagada"), eq(facturasClientes.estado, "pagado")));
      } else if (status === "adelantada") {
        conditions.push(or(eq(facturasClientes.estado, "adelantada"), eq(facturasClientes.estado, "adelantado")));
      } else if (status === "anulada") {
        conditions.push(or(eq(facturasClientes.estado, "anulada"), eq(facturasClientes.estado, "anulado"), eq(facturasClientes.estado, "cancelada")));
      } else {
        conditions.push(ilike(facturasClientes.estado, `%${status}%`));
      }
    }

    const data = await db
      .select({
        id: facturasClientes.id,
        numeroFactura: facturasClientes.numeroFactura,
        fechaFactura: facturasClientes.fechaFactura,
        fechaVencimiento: facturasClientes.fechaVencimiento,
        total: facturasClientes.total,
        estado: facturasClientes.estado,
        pendiente: cuentasPorCobrar.montoPendiente,
        clienteId: clientes.id,
        clienteNombre: clientes.nombre,
        clienteApellidos: clientes.apellidos,
      })
      .from(facturasClientes)
      .innerJoin(clientes, eq(facturasClientes.clienteId, clientes.id))
      .leftJoin(cuentasPorCobrar, eq(facturasClientes.id, cuentasPorCobrar.facturaId))
      .where(and(...conditions))
      .orderBy(desc(facturasClientes.createdAt))
      .limit(limit);

    return jsonResponse({
      success: true,
      data: data,
    });
  } catch (error: any) {
    console.error("Error in facturas listados:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
