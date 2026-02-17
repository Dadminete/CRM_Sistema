import { z } from "zod";

/**
 * Schema for factura detail item
 */
export const facturaDetalleSchema = z.object({
  descripcion: z
    .string()
    .min(1, "La descripción es requerida")
    .max(255, "La descripción no puede exceder 255 caracteres"),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0").int("La cantidad debe ser un número entero"),
  precioUnitario: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Formato de precio inválido")
    .transform((val) => val),
  descuento: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Formato de descuento inválido")
    .optional()
    .nullable()
    .transform((val) => val || "0.00"),
  itbis: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Formato de ITBIS inválido")
    .optional()
    .nullable()
    .transform((val) => val || "0.00"),
  productoId: z.string().uuid("ID de producto inválido").optional().nullable(),
  servicioId: z.string().uuid("ID de servicio inválido").optional().nullable(),
});

/**
 * Schema for creating a new factura
 */
export const createFacturaSchema = z.object({
  numeroFactura: z
    .string()
    .min(1, "El número de factura es requerido")
    .max(30, "El número de factura no puede exceder 30 caracteres"),
  clienteId: z.string().uuid("ID de cliente inválido"),
  fechaEmision: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, "Formato de fecha inválido"),
  fechaVencimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
    .optional()
    .nullable(),
  subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/, "Formato de subtotal inválido"),
  descuento: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Formato de descuento inválido")
    .optional()
    .nullable()
    .transform((val) => val || "0.00"),
  itbis: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Formato de ITBIS inválido")
    .optional()
    .nullable()
    .transform((val) => val || "0.00"),
  total: z.string().regex(/^\d+(\.\d{1,2})?$/, "Formato de total inválido"),
  moneda: z.string().length(3, "Código de moneda debe tener 3 caracteres").default("DOP").optional(),
  estado: z.enum(["pendiente", "pagada", "vencida", "cancelada", "anulada"]).default("pendiente").optional(),
  tipoFactura: z.enum(["servicio", "producto", "mixta"]).default("servicio").optional(),
  observaciones: z.string().optional().nullable(),
  contratoId: z.string().uuid("ID de contrato inválido").optional().nullable(),
  periodoFacturadoInicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
    .optional()
    .nullable(),
  periodoFacturadoFin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
    .optional()
    .nullable(),
  detalles: z.array(facturaDetalleSchema).min(1, "La factura debe tener al menos un detalle").optional(),
});

/**
 * Schema for updating a factura
 */
export const updateFacturaSchema = z.object({
  fechaVencimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
    .optional()
    .nullable(),
  estado: z.enum(["pendiente", "pagada", "vencida", "cancelada", "anulada"]).optional(),
  observaciones: z.string().optional().nullable(),
});

/**
 * Schema for factura payment
 */
export const registrarPagoSchema = z.object({
  facturaId: z.string().uuid("ID de factura inválido"),
  monto: z.string().regex(/^\d+(\.\d{1,2})?$/, "Formato de monto inválido"),
  metodoPago: z
    .string()
    .min(1, "El método de pago es requerido")
    .max(30, "El método de pago no puede exceder 30 caracteres"),
  numeroReferencia: z.string().max(50, "El número de referencia no puede exceder 50 caracteres").optional().nullable(),
  observaciones: z.string().optional().nullable(),
  fechaPago: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, "Formato de fecha inválido")
    .optional(),
});

export type FacturaDetalleInput = z.infer<typeof facturaDetalleSchema>;
export type CreateFacturaInput = z.infer<typeof createFacturaSchema>;
export type UpdateFacturaInput = z.infer<typeof updateFacturaSchema>;
export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;
