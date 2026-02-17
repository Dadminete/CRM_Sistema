import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { facturasClientes, clientes, detalleFacturas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });
    }

    const factura = await db
      .select({
        id: facturasClientes.id,
        numeroFactura: facturasClientes.numeroFactura,
        fechaFactura: facturasClientes.fechaFactura,
        total: facturasClientes.total,
        subtotal: facturasClientes.subtotal,
        itbis: facturasClientes.itbis,
        descuento: facturasClientes.descuento,
        estado: facturasClientes.estado,
        clienteId: clientes.id,
        clienteNombre: clientes.nombre,
        clienteApellidos: clientes.apellidos,
        clienteRnc: clientes.cedula,
        clienteTelefono: clientes.telefono,
        clienteEmail: clientes.email,
        clienteDireccion: clientes.direccion,
      })
      .from(facturasClientes)
      .innerJoin(clientes, eq(facturasClientes.clienteId, clientes.id))
      .where(eq(facturasClientes.id, id))
      .limit(1);

    if (factura.length === 0) {
      return NextResponse.json({ success: false, error: "Factura no encontrada" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(detalleFacturas)
      .where(eq(detalleFacturas.facturaId, id))
      .orderBy(detalleFacturas.orden);

    return NextResponse.json({
      success: true,
      data: {
        ...factura[0],
        items,
      },
    });
  } catch (error: any) {
    console.error("Error fetching factura detail:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
