import { describe, expect, it } from "vitest";

import { categorizarConflictoFactura } from "./conflictos";

describe("categorizarConflictoFactura", () => {
  it("marca como cancelada cuando la factura ya fue anulada o cancelada", () => {
    const resultado = categorizarConflictoFactura({ estado: "cancelada" });

    expect(resultado.esCancelada).toBe(true);
    expect(resultado.accionSugerida).toBe("duplicar");
    expect(resultado.mensaje).toContain("cancelada");
  });

  it("marca como activa cuando la factura ya existe y sigue abierta", () => {
    const resultado = categorizarConflictoFactura({ estado: "pendiente" });

    expect(resultado.esCancelada).toBe(false);
    expect(resultado.accionSugerida).toBe("omitir");
    expect(resultado.mensaje.toLowerCase()).toContain("ya existe");
  });
});
