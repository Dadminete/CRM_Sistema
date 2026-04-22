import { z } from "zod";

/**
 * Schema para crear un nuevo plan de internet
 */
export const createPlanSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre del plan es requerido")
    .max(150, "El nombre no puede exceder 150 caracteres"),
  descripcion: z
    .string()
    .max(500, "La descripción no puede exceder 500 caracteres")
    .optional()
    .nullable(),
  categoriaId: z
    .string()
    .uuid("El ID de categoría debe ser un UUID válido")
    .min(1, "La categoría es requerida"),
  precio: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Formato de precio inválido")
    .min(1, "El precio es requerido")
    .transform((val) => parseFloat(val)),
  moneda: z
    .string()
    .length(3, "El código de moneda debe tener 3 caracteres")
    .default("DOP")
    .optional(),
  subidaKbps: z
    .number()
    .int("La velocidad de subida debe ser un número entero")
    .min(1, "La velocidad de subida debe ser mayor a 0")
    .max(1000000, "La velocidad de subida no puede exceder 1,000,000 Kbps"),
  bajadaMbps: z
    .number()
    .int("La velocidad de bajada debe ser un número entero")
    .min(1, "La velocidad de bajada debe ser mayor a 0")
    .max(10000, "La velocidad de bajada no puede exceder 10,000 Mbps"),
  detalles: z
    .record(z.any())
    .optional()
    .nullable()
    .describe("Detalles adicionales del plan en formato JSON"),
  activo: z.boolean().default(true).optional(),
  orden: z
    .number()
    .int("El orden debe ser un número entero")
    .min(0, "El orden no puede ser negativo")
    .default(0)
    .optional(),
});

/**
 * Schema para actualizar un plan existente
 */
export const updatePlanSchema = createPlanSchema.partial();

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
