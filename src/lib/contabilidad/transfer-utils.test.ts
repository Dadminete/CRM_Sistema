import { describe, expect, it } from "vitest";

import { isTransferMovementRecord } from "./transfer-utils";

describe("isTransferMovementRecord", () => {
  it("excludes movement rows whose category matches the transfer category", () => {
    expect(
      isTransferMovementRecord({ categoriaId: "transfer-category", transferCategoryId: "transfer-category" }),
    ).toBe(true);
  });

  it("excludes movement rows whose description mentions traspaso or transferencia", () => {
    expect(isTransferMovementRecord({ descripcion: "Traspaso bancario a caja principal" })).toBe(true);
    expect(isTransferMovementRecord({ descripcion: "Transferencia interna entre cuentas" })).toBe(true);
  });

  it("keeps regular expenses that are not transfers", () => {
    expect(
      isTransferMovementRecord({
        tipo: "gasto",
        categoriaId: "expense-category",
        descripcion: "Compra de suministros",
      }),
    ).toBe(false);
  });
});
