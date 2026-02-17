import { z } from "zod";

export const bankSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100, "El nombre es muy largo"),
  codigo: z.string().optional(),
  activo: z.boolean().default(true),
});

export type BankFormValues = z.infer<typeof bankSchema>;

export const bankAccountSchema = z.object({
  numeroCuenta: z.string().min(1, "El número de cuenta es requerido").max(50, "El número es muy largo"),
  tipoCuenta: z.string().optional(),
  moneda: z.string().default("DOP"),
  nombreOficialCuenta: z.string().optional(),
  cuentaContableId: z.string().uuid("Debe seleccionar una cuenta contable válida"),
  activo: z.boolean().default(true),
  observaciones: z.string().optional(),
});

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>;
