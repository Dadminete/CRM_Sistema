import { describe, expect, it } from "vitest";

import {
  calcularCantidadPeriodosAdelantados,
  formatearPeriodoFacturado,
  normalizarCantidadMesesAdelantados,
  resolverPeriodoBaseAdelantado,
} from "./periodos";

describe("periodos de facturación adelantada", () => {
  it("normaliza los meses adicionales al rango permitido", () => {
    expect(normalizarCantidadMesesAdelantados(0)).toBe(0);
    expect(normalizarCantidadMesesAdelantados(1)).toBe(1);
    expect(normalizarCantidadMesesAdelantados(2)).toBe(2);
    expect(normalizarCantidadMesesAdelantados(4)).toBe(2);
  });

  it("convierte meses adicionales en periodos consecutivos", () => {
    expect(calcularCantidadPeriodosAdelantados(0)).toBe(1);
    expect(calcularCantidadPeriodosAdelantados(1)).toBe(2);
    expect(calcularCantidadPeriodosAdelantados(2)).toBe(3);
    expect(calcularCantidadPeriodosAdelantados(5)).toBe(3);
  });

  it("genera una etiqueta legible para el periodo facturado", () => {
    expect(formatearPeriodoFacturado(8, 2026)).toBe("Agosto 2026");
    expect(formatearPeriodoFacturado(1, 2027, { mayusculas: true })).toBe("ENERO 2027");
  });

  it("usa el mes de inicio seleccionado cuando la factura es por adelantado", () => {
    expect(
      resolverPeriodoBaseAdelantado({
        pagoAdelantadoHabilitado: true,
        mesPeriodo: 7,
        anioPeriodo: 2026,
        mesAdelantado: 8,
        anioAdelantado: 2026,
      }),
    ).toEqual({ mes: 8, anio: 2026 });
  });
});
