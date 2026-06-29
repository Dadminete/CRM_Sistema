export interface ConflictoFactura {
  estado?: string;
  numeroFactura?: string;
  mes?: number;
  anio?: number;
}

export interface ResumenConflicto {
  esCancelada: boolean;
  accionSugerida: "duplicar" | "omitir" | "preguntar";
  mensaje: string;
}

const ESTADOS_CANCELADOS = new Set(["anulada", "cancelada", "anulado", "cancelado"]);

export function categorizarConflictoFactura(conflicto: ConflictoFactura): ResumenConflicto {
  const estado = String(conflicto.estado || "").trim().toLowerCase();
  const periodo = conflicto.mes && conflicto.anio ? `${conflicto.mes}/${conflicto.anio}` : "el periodo seleccionado";

  if (ESTADOS_CANCELADOS.has(estado)) {
    return {
      esCancelada: true,
      accionSugerida: "duplicar",
      mensaje: `Ya existe una factura cancelada para ${periodo}. Puedes duplicarla o crear una nueva si deseas emitirla nuevamente.`,
    };
  }

  if (estado) {
    return {
      esCancelada: false,
      accionSugerida: "omitir",
      mensaje: `Ya existe una factura activa para ${periodo}. El sistema recomienda omitirla y no duplicarla.`,
    };
  }

  return {
    esCancelada: false,
    accionSugerida: "preguntar",
    mensaje: `Se encontró un conflicto para ${periodo}. Revisa el estado de la factura antes de continuar.`,
  };
}
