import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientes, facturasClientes, tickets } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Fetch client basic info
    const [client] = await db.select().from(clientes).where(eq(clientes.id, id));

    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    // 2. Fetch invoices
    const invoices = await db
      .select()
      .from(facturasClientes)
      .where(eq(facturasClientes.clienteId, id))
      .orderBy(desc(facturasClientes.fechaFactura))
      .limit(10); // Limit to recent 10 for performance

    // 3. Fetch tickets (averías)
    const clientTickets = await db
      .select()
      .from(tickets)
      .where(eq(tickets.clienteId, id))
      .orderBy(desc(tickets.fechaCreacion))
      .limit(10);

    return NextResponse.json(
      JSON.parse(
        JSON.stringify(
          {
            success: true,
            client,
            invoices,
            tickets: clientTickets,
          },
          (key, value) => (typeof value === "bigint" ? value.toString() : value),
        ),
      ),
    );
  } catch (error: any) {
    console.error("Error fetching client details:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const [updatedClient] = await db
      .update(clientes)
      .set({
        ...body,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(clientes.id, id))
      .returning();

    if (!updatedClient) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    return NextResponse.json(
      JSON.parse(
        JSON.stringify({ success: true, client: updatedClient }, (key, value) =>
          typeof value === "bigint" ? value.toString() : value,
        ),
      ),
    );
  } catch (error: any) {
    console.error("Error updating client:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await db.delete(clientes).where(eq(clientes.id, id));

    return NextResponse.json({ success: true, message: "Cliente eliminado" });
  } catch (error: any) {
    console.error("Error deleting client:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
