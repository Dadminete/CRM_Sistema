import { describe, expect, it } from "vitest";

import { getCategoryTrendState } from "@/app/(main)/dashboard/contabilidad/finanzas/trend-utils";

describe("getCategoryTrendState", () => {
  it("returns Sube for positive changes", () => {
    expect(getCategoryTrendState(12.5)).toBe("Sube");
  });

  it("returns Baja for negative changes", () => {
    expect(getCategoryTrendState(-8.25)).toBe("Baja");
  });

  it("returns Estable for zero or missing values", () => {
    expect(getCategoryTrendState(0)).toBe("Estable");
    expect(getCategoryTrendState(null)).toBe("Estable");
  });
});
