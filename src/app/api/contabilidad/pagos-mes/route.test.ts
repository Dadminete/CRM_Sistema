import { describe, expect, it } from "vitest";

import { esFacturaAdelantada } from "./lib";

describe("esFacturaAdelantada", () => {
  it("marca como adelantada cuando el registro viene con el flag booleano", () => {
    expect(esFacturaAdelantada("pagado", null, true)).toBe(true);
  });

  it("marca como adelantada cuando las observaciones indican pago adelantado", () => {
    expect(esFacturaAdelantada("pagado", "PAGO_ADELANTADO | MESES_ADELANTADOS:1", false)).toBe(true);
  });
});
