import z from "zod";

export const recentLeadSchema = z.object({
  id: z.string(),
  name: z.string(),
  company: z.string(),
  status: z.string(),
  source: z.string(),
  lastActivity: z.string(),
});

export const recentMovementSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  monto: z.string().or(z.number()),
  descripcion: z.string().nullable(),
  fecha: z.string(),
  metodo: z.string(),
  categoria: z.string().nullable(),
});
