import { z } from "zod";

/**
 * Schema for creating a new ticket (avería)
 */
export const createTicketSchema = z.object({
    asunto: z.string().min(1, "El asunto es requerido").max(200, "El asunto no puede exceder 200 caracteres"),
    descripcion: z.string().min(1, "La descripción es requerida"),
    categoria: z.string().min(1, "La categoría es requerida").max(50),
    prioridad: z.enum(["baixa", "media", "alta", "critica"]).default("media").optional(),
    clienteId: z.string().uuid("ID de cliente inválido").optional().nullable(),
    suscripcionId: z.string().uuid("ID de suscripción inválido").optional().nullable(),
    contratoId: z.string().uuid("ID de contrato inválido").optional().nullable(),
    tecnicoAsignadoId: z.number().optional().nullable(),
    notas: z.string().optional().nullable(),
});

/**
 * Schema for updating a ticket
 */
export const updateTicketSchema = createTicketSchema.partial().extend({
    estado: z.enum(["abierto", "proceso", "cerrado", "cancelado"]).optional(),
    fechaCierre: z.string().optional().nullable(),
    tiempoRespuesta: z.number().optional().nullable(),
    satisfaccion: z.number().min(1).max(5).optional().nullable(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
