import { describe, expect, it } from "vitest";

import { formatCurrency } from "@/lib/utils";

describe("formatCurrency", () => {
  it("preserves cents for decimal amounts", () => {
    const expected = new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(1439.4);

    expect(formatCurrency(1439.4)).toBe(expected);
  });
});
