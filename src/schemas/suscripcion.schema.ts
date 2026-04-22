import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const updateSuscripcionSchema = z
  .object({
    servicioId: z.string().uuid("Servicio invalido").nullable().optional(),
    planId: z.number().int("Plan invalido").positive("Plan invalido").nullable().optional(),
    estado: z.enum(["pendiente", "activo", "cancelada"]).optional(),
    precioMensual: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Formato de precio invalido")
      .optional(),
    descuentoAplicado: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Formato de descuento invalido")
      .optional(),
    diaFacturacion: z.number().int("Dia de facturacion invalido").min(1).max(31).optional(),
    fechaProximoPago: z.string().regex(dateRegex, "Fecha proximo pago invalida").nullable().optional(),
    fechaVencimiento: z.string().regex(dateRegex, "Fecha vencimiento invalida").nullable().optional(),
    notasInstalacion: z.string().max(1000, "Notas de instalacion muy largas").nullable().optional(),
    notasServicio: z.string().max(1000, "Notas de servicio muy largas").nullable().optional(),
  })
  .refine(
    (data) => {
      if (!data.fechaProximoPago || !data.fechaVencimiento) {
        return true;
      }
      return data.fechaVencimiento >= data.fechaProximoPago;
    },
    {
      message: "La fecha de vencimiento no puede ser menor a la fecha de proximo pago",
      path: ["fechaVencimiento"],
    },
  );

export type UpdateSuscripcionInput = z.infer<typeof updateSuscripcionSchema>;
