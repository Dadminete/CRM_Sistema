import { describe, expect, it, vi } from "vitest";

import {
  buildCreateClientPayload,
  fetchCatalog,
  getErrorMessage,
  toNullable,
} from "@/app/(main)/dashboard/clientes/crear/_components/create-client-form-utils";
import { initialForm } from "@/app/(main)/dashboard/clientes/crear/_components/form-state";

describe("create-client-form-utils", () => {
  describe("toNullable", () => {
    it("returns null for empty/blank values", () => {
      expect(toNullable("")).toBeNull();
      expect(toNullable("   ")).toBeNull();
    });

    it("returns trimmed string for non-empty values", () => {
      expect(toNullable("  hola  ")).toBe("hola");
    });
  });

  describe("getErrorMessage", () => {
    it("returns Error.message when available", () => {
      expect(getErrorMessage(new Error("fallo controlado"))).toBe("fallo controlado");
    });

    it("returns fallback message for unknown errors", () => {
      expect(getErrorMessage({})).toBe("No se pudo cargar la configuracion comercial");
    });
  });

  describe("buildCreateClientPayload", () => {
    it("maps commercial and optional fields correctly", () => {
      const formData = {
        ...initialForm,
        codigoCliente: "  C-001  ",
        nombre: "  Ana ",
        apellidos: " Perez  ",
        cedula: "  ",
        diasCredito: "30",
        planId: "123",
        servicioIds: ["srv-1", "srv-2"],
      };

      const payload = buildCreateClientPayload(formData);

      expect(payload.codigoCliente).toBe("C-001");
      expect(payload.nombre).toBe("Ana");
      expect(payload.apellidos).toBe("Perez");
      expect(payload.cedula).toBeNull();
      expect(payload.diasCredito).toBe(30);
      expect(payload.planId).toBe(123);
      expect(payload.servicioIds).toEqual(["srv-1", "srv-2"]);
    });

    it("maps empty numeric optional fields to null", () => {
      const payload = buildCreateClientPayload({
        ...initialForm,
        codigoCliente: "CLI-9",
        nombre: "Mario",
        apellidos: "Lopez",
      });

      expect(payload.diasCredito).toBeNull();
      expect(payload.planId).toBeNull();
      expect(payload.servicioIds).toEqual([]);
    });
  });

  describe("fetchCatalog", () => {
    it("returns paginated data array", async () => {
      const fetchImpl = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { data: [{ id: "1" }, { id: "2" }] } }),
      });

      const result = await fetchCatalog<{ id: string }>("/api/test", "fallback", fetchImpl as unknown as typeof fetch);
      expect(result).toEqual([{ id: "1" }, { id: "2" }]);
    });

    it("throws with API error message when response is not ok", async () => {
      const fetchImpl = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: "No autorizado" }),
      });

      await expect(fetchCatalog("/api/test", "fallback", fetchImpl as unknown as typeof fetch)).rejects.toThrow(
        "No autorizado",
      );
    });

    it("throws fallback when API has no error message", async () => {
      const fetchImpl = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false }),
      });

      await expect(fetchCatalog("/api/test", "fallback", fetchImpl as unknown as typeof fetch)).rejects.toThrow(
        "fallback",
      );
    });
  });
});
