import { z } from "zod";

/**
 * Schema for creating a new cliente
 */
export const createClienteSchema = z.object({
  codigoCliente: z
    .string()
    .min(1, "El código de cliente es requerido")
    .max(30, "El código no puede exceder 30 caracteres"),
  nombre: z.string().min(1, "El nombre es requerido").max(100, "El nombre no puede exceder 100 caracteres"),
  apellidos: z
    .string()
    .min(1, "Los apellidos son requeridos")
    .max(100, "Los apellidos no pueden exceder 100 caracteres"),
  cedula: z.string().max(20, "La cédula no puede exceder 20 caracteres").optional().nullable(),
  rnc: z
    .string()
    .max(20, "El RNC no puede exceder 20 caracteres")
    .regex(/^[0-9]*$/, "El RNC solo puede contener números")
    .optional()
    .nullable(),
  telefono: z
    .string()
    .max(20, "El teléfono no puede exceder 20 caracteres")
    .regex(/^[0-9\-\+\(\)\s]*$/, "Formato de teléfono inválido")
    .optional()
    .nullable(),
  celular: z
    .string()
    .max(20, "El celular no puede exceder 20 caracteres")
    .regex(/^[0-9\-\+\(\)\s]*$/, "Formato de celular inválido")
    .optional()
    .nullable(),
  email: z.string().email("Email inválido").max(100, "El email no puede exceder 100 caracteres").optional().nullable(),
  direccion: z.string().optional().nullable(),
  sector: z.string().max(100).optional().nullable(),
  ciudad: z.string().max(100).optional().nullable(),
  provincia: z.string().max(100).optional().nullable(),
  pais: z.string().max(100).default("República Dominicana").optional(),
  codigoPostal: z.string().max(10).optional().nullable(),
  coordenadas: z.string().optional().nullable(),
  tipoCliente: z.enum(["residencial", "empresarial"]).default("residencial").optional(),
  categoria: z.enum(["NUEVO", "VIEJO", "VIP", "INACTIVO"]).default("NUEVO").optional(),
  limiteCredito: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Formato de monto inválido")
    .optional()
    .nullable()
    .transform((val) => (val ? val : null)),
  diasCredito: z
    .number()
    .int("Debe ser un número entero")
    .min(0, "Los días de crédito no pueden ser negativos")
    .max(365, "Los días de crédito no pueden exceder 365")
    .optional()
    .nullable(),
  descuentoCliente: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Formato de porcentaje inválido")
    .optional()
    .nullable()
    .transform((val) => (val ? val : null)),
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
    .optional()
    .nullable(),
  sexo: z.enum(["M", "F"]).optional().nullable(),
  estadoCivil: z.string().max(20).optional().nullable(),
  ocupacion: z.string().max(100).optional().nullable(),
  nombreEmpresa: z.string().max(200).optional().nullable(),
  cargoEmpresa: z.string().max(100).optional().nullable(),
  ingresosMensuales: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Formato de monto inválido")
    .optional()
    .nullable()
    .transform((val) => (val ? val : null)),
  referenciaPersonal: z.string().max(200).optional().nullable(),
  telefonoReferencia: z
    .string()
    .max(20)
    .regex(/^[0-9\-\+\(\)\s]*$/, "Formato de teléfono inválido")
    .optional()
    .nullable(),
  observaciones: z.string().optional().nullable(),
  activo: z.boolean().default(true).optional(),
  aceptaPromociones: z.boolean().default(true).optional(),
  fotoUrl: z.string().optional().nullable(),
  planId: z
    .number()
    .int("El plan seleccionado no es valido")
    .positive("El plan seleccionado no es valido")
    .optional()
    .nullable(),
  servicioIds: z.array(z.string().uuid("Servicio adicional invalido")).max(20).optional().default([]),
});

/**
 * Schema for updating a cliente
 */
export const updateClienteSchema = createClienteSchema.partial().omit({
  codigoCliente: true, // Cannot change code after creation
});

export type CreateClienteInput = z.infer<typeof createClienteSchema>;
export type UpdateClienteInput = z.infer<typeof updateClienteSchema>;
