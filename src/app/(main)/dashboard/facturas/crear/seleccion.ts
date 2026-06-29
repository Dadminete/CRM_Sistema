export interface SuscripcionSeleccionable {
  id: string;
  tieneFacturaPeriodo?: boolean | null;
  estadoFacturaPeriodo?: string | null;
  mensajeFacturaPeriodo?: string | null;
}

export interface EstadoBloqueoFactura {
  esBloqueado: boolean;
  mensaje: string | null;
}

export function obtenerEstadoBloqueoFactura<T extends SuscripcionSeleccionable>(suscripcion: T): EstadoBloqueoFactura {
  if (!suscripcion.tieneFacturaPeriodo) {
    return { esBloqueado: false, mensaje: null };
  }

  return {
    esBloqueado: true,
    mensaje: suscripcion.mensajeFacturaPeriodo || "Este cliente ya tiene factura creada para este periodo.",
  };
}

export function obtenerSuscripcionesSeleccionables<T extends SuscripcionSeleccionable>(suscripciones: T[]): T[] {
  return suscripciones.filter((suscripcion) => !suscripcion.tieneFacturaPeriodo);
}

export function obtenerIdsParaSeleccionMasiva<T extends SuscripcionSeleccionable>(
  suscripciones: T[],
  seleccionActual: Set<string>,
): Set<string> {
  const suscripcionesDisponibles = obtenerSuscripcionesSeleccionables(suscripciones);
  if (suscripcionesDisponibles.length === 0) {
    return new Set<string>();
  }

  const idsDisponibles = new Set(suscripcionesDisponibles.map((suscripcion) => suscripcion.id));
  const seleccionadasDisponibles = new Set(
    Array.from(seleccionActual).filter((id) => idsDisponibles.has(id)),
  );

  if (idsDisponibles.size === seleccionadasDisponibles.size) {
    return new Set<string>();
  }

  return idsDisponibles;
}
