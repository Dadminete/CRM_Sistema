import { describe, expect, it } from "vitest";

import { obtenerEstadoBloqueoFactura, obtenerIdsParaSeleccionMasiva } from "./seleccion";

describe("selección masiva de facturas", () => {
  it("solo incluye suscripciones sin factura para el periodo actual", () => {
    const suscripciones = [
      { id: "a", tieneFacturaPeriodo: false },
      { id: "b", tieneFacturaPeriodo: true },
      { id: "c", tieneFacturaPeriodo: false },
    ];

    const seleccion = obtenerIdsParaSeleccionMasiva(suscripciones, new Set(["a"]));

    expect(Array.from(seleccion).sort()).toEqual(["a", "c"]);
  });

  it("devuelve un mensaje informativo para las suscripciones bloqueadas por factura existente", () => {
    const estado = obtenerEstadoBloqueoFactura({
      tieneFacturaPeriodo: true,
      estadoFacturaPeriodo: "adelantada",
      mensajeFacturaPeriodo: "Ya tiene factura creada y pagada por adelantado para este periodo.",
    });

    expect(estado).toEqual({
      esBloqueado: true,
      mensaje: "Ya tiene factura creada y pagada por adelantado para este periodo.",
    });
  });
});
