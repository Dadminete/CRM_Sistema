import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const optionalNullableString = z.string().trim().nullable().optional();

export function normalizeMacAddress(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const cleaned = String(value).trim();
  if (!cleaned) return null;

  const hexOnly = cleaned.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  if (hexOnly.length !== 12) return null;

  const pairs = hexOnly.match(/.{1,2}/g);
  if (!pairs || pairs.length !== 6) return null;

  return pairs.join(":");
}

function isValidMac(value: string): boolean {
  return normalizeMacAddress(value) !== null;
}

function isValidIpv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255;
  });
}

export const equipoBaseSchema = z.object({
  clienteId: z.string().uuid("Cliente invalido"),
  suscripcionId: z.string().uuid("Suscripcion invalida").nullable().optional(),
  tipoEquipo: z.string().trim().min(1, "El tipo de equipo es requerido").max(50),
  marca: z.string().trim().min(1, "La marca es requerida").max(100),
  modelo: z.string().trim().min(1, "El modelo es requerido").max(100),
  numeroSerie: z.string().trim().min(1, "El numero de serie es requerido").max(100),
  macAddress: z
    .preprocess((value) => normalizeMacAddress(value), z.string())
    .refine((value) => isValidMac(value), "MAC invalida")
    .nullable()
    .optional(),
  ipAsignada: z
    .string()
    .trim()
    .refine((value) => isValidIpv4(value), "IP invalida")
    .nullable()
    .optional(),
  estado: z.string().trim().max(20).optional().default("instalado"),
  fechaInstalacion: z.string().regex(dateRegex, "Fecha de instalacion invalida").nullable().optional(),
  fechaRetiro: z.string().regex(dateRegex, "Fecha de retiro invalida").nullable().optional(),
  ubicacion: optionalNullableString,
  notas: optionalNullableString,
});

const equipoBulkRowSchema = equipoBaseSchema.omit({
  clienteId: true,
});

export const createEquipoSchema = equipoBaseSchema.refine(
  (data) => {
    if (!data.fechaInstalacion || !data.fechaRetiro) {
      return true;
    }
    return data.fechaRetiro >= data.fechaInstalacion;
  },
  {
    message: "La fecha de retiro no puede ser menor que la fecha de instalacion",
    path: ["fechaRetiro"],
  },
);

export const createEquiposBulkSchema = z.object({
  clienteId: z.string().uuid("Cliente invalido"),
  equipos: z
    .array(equipoBulkRowSchema)
    .min(1, "Debes enviar al menos un equipo")
    .max(100, "No puedes registrar mas de 100 equipos por lote"),
});

export type CreateEquipoInput = z.infer<typeof createEquipoSchema>;
export type CreateEquiposBulkInput = z.infer<typeof createEquiposBulkSchema>;
