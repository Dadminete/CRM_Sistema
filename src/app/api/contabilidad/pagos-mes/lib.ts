const ESTADOS_ADELANTADOS = new Set([
  "adelantado",
  "adelantada",
  "pago adelantado",
  "pago_adelantado",
]);

export function esFacturaAdelantada(
  estado?: string | null,
  observaciones?: string | null,
  pagoAdelantado?: boolean | null,
): boolean {
  if (pagoAdelantado) {
    return true;
  }

  const estadoNormalizado = String(estado ?? "").trim().toLowerCase();
  if (ESTADOS_ADELANTADOS.has(estadoNormalizado)) {
    return true;
  }

  const textoObservaciones = String(observaciones ?? "").trim().toLowerCase();
  return textoObservaciones.includes("pago_adelantado") || textoObservaciones.includes("pago adelantado");
}
