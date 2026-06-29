export function normalizarCantidadMesesAdelantados(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(2, Math.trunc(parsed)));
}

export function calcularMesesAdelantadosAdicionales(value: number | string | null | undefined): number {
  return normalizarCantidadMesesAdelantados(value);
}

export function calcularCantidadPeriodosAdelantados(value: number | string | null | undefined): number {
  return Math.min(3, 1 + normalizarCantidadMesesAdelantados(value));
}

export function resolverPeriodoBaseAdelantado({
  pagoAdelantadoHabilitado,
  mesPeriodo,
  anioPeriodo,
  mesAdelantado,
  anioAdelantado,
  isLegacyAdvanceMode = false,
}: {
  pagoAdelantadoHabilitado: boolean;
  mesPeriodo: number | string | null | undefined;
  anioPeriodo: number | string | null | undefined;
  mesAdelantado: number | string | null | undefined;
  anioAdelantado: number | string | null | undefined;
  isLegacyAdvanceMode?: boolean;
}): { mes: number; anio: number } {
  const debeUsarMesAdelantado =
    Boolean(pagoAdelantadoHabilitado) &&
    (Boolean(isLegacyAdvanceMode) || (mesAdelantado !== undefined && anioAdelantado !== undefined));

  return {
    mes: debeUsarMesAdelantado ? Number(mesAdelantado ?? mesPeriodo) : Number(mesPeriodo),
    anio: debeUsarMesAdelantado ? Number(anioAdelantado ?? anioPeriodo) : Number(anioPeriodo),
  };
}

const MESES_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export function formatearPeriodoFacturado(
  mes: number | string | null | undefined,
  anio: number | string | null | undefined,
  options?: { mayusculas?: boolean },
): string {
  const mesNumero = Number(mes ?? 0);
  const anioNumero = Number(anio ?? 0);

  if (!Number.isInteger(mesNumero) || mesNumero < 1 || mesNumero > 12 || !Number.isInteger(anioNumero)) {
    return "Periodo no definido";
  }

  const label = `${MESES_LABELS[mesNumero - 1] ?? "Mes"} ${anioNumero}`;
  return options?.mayusculas ? label.toUpperCase() : label;
}
