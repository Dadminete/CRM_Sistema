import { NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { tickets, clientes, respuestasTickets } from "@/lib/db/schema";
import { validateRequest } from "@/lib/validation";
import { updateTicketSchema } from "@/schemas/ticket.schema";

// GET: Get ticket details with client and responses
export const GET = withAuth(
    async (req: NextRequest, { params }) => {
        try {
            const { id } = params;

            const [ticketData] = await db
                .select({
                    ticket: tickets,
                    cliente: {
                        id: clientes.id,
                        nombre: clientes.nombre,
                        apellidos: clientes.apellidos,
                        codigoCliente: clientes.codigoCliente,
                        telefono: clientes.telefono,
                        telefonoSecundario: clientes.telefonoSecundario,
                        direccion: clientes.direccion,
                    },
                })
                .from(tickets)
                .leftJoin(clientes, eq(tickets.clienteId, clientes.id))
                .where(eq(tickets.id, id))
                .limit(1);

            if (!ticketData) {
                return CommonErrors.notFound("Ticket no encontrado");
            }

            // Fetch responses
            const responses = await db
                .select()
                .from(respuestasTickets)
                .where(eq(respuestasTickets.ticketId, id))
                .orderBy(sql`fecha_respuesta ASC`);

            const serializedData = JSON.parse(
                JSON.stringify({ ...ticketData, responses }, (key, value) => (typeof value === "bigint" ? value.toString() : value)),
            );

            return successResponse(serializedData);
        } catch (error: any) {
            console.error("Error fetching ticket detail:", error);
            return CommonErrors.internalError("Error al obtener detalles de la avería");
        }
    },
    { requiredPermission: "tickets:leer" },
);

// PATCH: Update ticket status or details
export const PATCH = withAuth(
    async (req: NextRequest, { params, user }) => {
        try {
            const { id } = params;
            const body = await req.json();

            // Validate request body
            const { data: validatedData, error } = await validateRequest(body, updateTicketSchema);
            if (error) return error;

            const [updatedTicket] = await db
                .update(tickets)
                .set({
                    ...validatedData,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                })
                .where(eq(tickets.id, id))
                .returning();

            if (!updatedTicket) {
                return CommonErrors.notFound("Ticket no encontrado");
            }

            // If a response message was provided in the extra data (not in schema but common in this app)
            if (body.mensaje) {
                await db.insert(respuestasTickets).values({
                    ticketId: id,
                    usuarioId: user.id,
                    mensaje: body.mensaje,
                    esInterno: body.esInterno || false,
                    fechaRespuesta: sql`CURRENT_TIMESTAMP`,
                });
            }

            return successResponse({ ticket: updatedTicket });
        } catch (error: any) {
            console.error("Error updating ticket:", error);
            return CommonErrors.internalError("Error al actualizar avería");
        }
    },
    { requiredPermission: "tickets:actualizar" },
);
