import { describe, expect, it } from "vitest";

import { resolveTransferRouteId } from "./route";

describe("resolveTransferRouteId", () => {
  it("returns the id from a plain params object", () => {
    expect(resolveTransferRouteId({ id: "abc-123" })).toBe("abc-123");
  });

  it("returns the id from a promised params object", async () => {
    await expect(resolveTransferRouteId(Promise.resolve({ id: "def-456" }))).resolves.toBe("def-456");
  });

  it("returns undefined when the id is missing", () => {
    expect(resolveTransferRouteId(undefined)).toBeUndefined();
  });
});
