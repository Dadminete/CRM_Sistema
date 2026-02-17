import { z } from "zod";

export const invoiceSchema = z.object({
  id: z.string(),
  numeroFactura: z.string(),
  fechaFactura: z.string(),
  fechaVencimiento: z.string().nullable(),
  total: z.string(),
  estado: z.string(),
  montoPendiente: z.string(),
  clienteId: z.string(),
  clienteNombre: z.string(),
  clienteApellidos: z.string().nullable(),
  clienteEmail: z.string().nullable(),
  clienteTelefono: z.string().nullable(),
  diaFacturacion: z.number().nullable(),
});

export type Invoice = z.infer<typeof invoiceSchema>;
