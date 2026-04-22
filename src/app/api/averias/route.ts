import { NextRequest, NextResponse } from "next/server";
import { asc, eq, sql, desc } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { tickets, clientes } from "@/lib/db/schema";
import { getPaginationParams, getPaginationOffset, getTotalCount, createPaginatedData } from "@/lib/pagination";
import { validateRequest } from "@/lib/validation";
import { createTicketSchema } from "@/schemas/ticket.schema";

// Helper to generate ticket number
async function generateTicketNumber() {
    const [lastTicket] = await db
        .select({ numeroTicket: tickets.numeroTicket })
        .from(tickets)
        .orderBy(desc(tickets.numeroTicket))
        .limit(1);

    let nextNumber = 1;
    if (lastTicket && lastTicket.numeroTicket.startsWith("TK-")) {
        const currentNumber = parseInt(lastTicket.numeroTicket.split("-")[1]);
        if (!isNaN(currentNumber)) {
            nextNumber = currentNumber + 1;
        }
    }

    return `TK-${nextNumber.toString().padStart(6, "0")}`;
}

export const GET = withAuth(
    async (req: NextRequest) => {
        try {
            const { page, limit } = getPaginationParams(req);
            const offset = getPaginationOffset(page, limit);

            const total = await getTotalCount(tickets);

            const allTickets = await db
                .select({
                    ticket: tickets,
                    cliente: {
                        id: clientes.id,
                        nombre: clientes.nombre,
                        apellidos: clientes.apellidos,
                        codigoCliente: clientes.codigoCliente,
                    },
                })
                .from(tickets)
                .leftJoin(clientes, eq(tickets.clienteId, clientes.id))
                .limit(limit)
                .offset(offset)
                .orderBy(desc(tickets.fechaCreacion));

            const serializedTickets = JSON.parse(
                JSON.stringify(allTickets, (key, value) => (typeof value === "bigint" ? value.toString() : value)),
            );

            return successResponse(createPaginatedData(serializedTickets, page, limit, total));
        } catch (error: any) {
            console.error("Error fetching tickets:", error);
            return CommonErrors.internalError("Error al obtener tickets de avería");
        }
    },
    { requiredPermission: "tickets:leer" },
);

export const POST = withAuth(
    async (req: NextRequest, { user }) => {
        try {
            const body = await req.json();

            // Validate request body
            const { data: validatedData, error } = await validateRequest(body, createTicketSchema);
            if (error) return error;

            const numeroTicket = await generateTicketNumber();

            const [newTicket] = await db
                .insert(tickets)
                .values({
                    ...validatedData,
                    numeroTicket,
                    usuarioId: user.id, // User who created the ticket
                    estado: "abierto",
                    fechaCreacion: sql`CURRENT_TIMESTAMP`,
                    createdAt: sql`CURRENT_TIMESTAMP`,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                })
                .returning();

            return successResponse({ ticket: newTicket }, undefined, 201);
        } catch (error: any) {
            console.error("Error creating ticket:", error);
            return CommonErrors.internalError("Error al registrar avería");
        }
    },
    { requiredPermission: "tickets:crear" },
);
