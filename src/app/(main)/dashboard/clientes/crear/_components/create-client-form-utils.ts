import type { FormState } from "./form-state";

export type PaginatedData<T> = {
  success?: boolean;
  error?: string;
  data?: {
    data?: T[];
  };
};

export function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length) return error.message;
  return "No se pudo cargar la configuracion comercial";
}

export async function fetchCatalog<T>(
  url: string,
  fallbackError: string,
  fetchImpl: typeof fetch = fetch,
): Promise<T[]> {
  const response = await fetchImpl(url);
  const result = (await response.json()) as PaginatedData<T>;

  if (!response.ok || result.success === false) {
    throw new Error(result.error ?? fallbackError);
  }

  return Array.isArray(result.data?.data) ? result.data.data : [];
}

export function buildCreateClientPayload(formData: FormState) {
  return {
    codigoCliente: formData.codigoCliente.trim(),
    nombre: formData.nombre.trim(),
    apellidos: formData.apellidos.trim(),
    cedula: toNullable(formData.cedula),
    telefono: toNullable(formData.telefono),
    celular: toNullable(formData.celular),
    email: toNullable(formData.email),
    direccion: toNullable(formData.direccion),
    tipoCliente: formData.tipoCliente,
    categoria: formData.categoria,
    sector: toNullable(formData.sector),
    ciudad: toNullable(formData.ciudad),
    provincia: toNullable(formData.provincia),
    codigoPostal: toNullable(formData.codigoPostal),
    coordenadas: toNullable(formData.coordenadas),
    limiteCredito: toNullable(formData.limiteCredito),
    diasCredito: formData.diasCredito.trim().length ? Number(formData.diasCredito) : null,
    descuentoCliente: toNullable(formData.descuentoCliente),
    sexo: formData.sexo.length ? formData.sexo : null,
    ocupacion: toNullable(formData.ocupacion),
    nombreEmpresa: toNullable(formData.nombreEmpresa),
    referenciaPersonal: toNullable(formData.referenciaPersonal),
    observaciones: toNullable(formData.observaciones),
    activo: formData.activo,
    aceptaPromociones: formData.aceptaPromociones,
    fotoUrl: toNullable(formData.fotoUrl),
    planId: formData.planId ? Number(formData.planId) : null,
    servicioIds: formData.servicioIds,
  };
}
