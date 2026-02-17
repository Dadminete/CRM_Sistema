import { describe, it, expect } from "vitest";

import {
  exportToExcel,
  formatDateForExcel,
  formatDateTimeForExcel,
  formatCurrencyForExcel,
  formatBooleanForExcel,
} from "@/lib/export/excel";

describe("Excel Export Library", () => {
  describe("formatDateForExcel", () => {
    it("should format valid date string", () => {
      const date = "2024-01-15";
      const result = formatDateForExcel(date);

      // toLocaleDateString('es-ES') format (may vary by locale)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it("should handle null date", () => {
      const result = formatDateForExcel(null);
      expect(result).toBe("");
    });

    it("should handle undefined date", () => {
      const result = formatDateForExcel(undefined as any);
      expect(result).toBe("");
    });

    it("should handle invalid date", () => {
      const result = formatDateForExcel("invalid-date");
      expect(result).toContain("Invalid");
    });
  });

  describe("formatDateTimeForExcel", () => {
    it("should format valid datetime string", () => {
      const datetime = "2024-01-15T14:30:00Z";
      const result = formatDateTimeForExcel(datetime);

      expect(result).toContain("/");
      expect(result).toContain(":");
    });

    it("should handle null datetime", () => {
      const result = formatDateTimeForExcel(null);
      expect(result).toBe("");
    });

    it("should handle invalid datetime", () => {
      const result = formatDateTimeForExcel("not-a-date");
      expect(result).toContain("Invalid");
    });
  });

  describe("formatCurrencyForExcel", () => {
    it("should format number with currency symbol", () => {
      const result = formatCurrencyForExcel(1000);
      expect(result).toBe("$1000.00");
    });

    it("should format decimal numbers", () => {
      const result = formatCurrencyForExcel(1234.56);
      expect(result).toBe("$1234.56");
    });

    it("should handle zero", () => {
      const result = formatCurrencyForExcel(0);
      expect(result).toBe("$0.00");
    });

    it("should handle negative numbers", () => {
      const result = formatCurrencyForExcel(-500);
      expect(result).toBe("$-500.00");
    });

    it("should handle null", () => {
      const result = formatCurrencyForExcel(null as any);
      expect(result).toBe("");
    });
  });

  describe("formatBooleanForExcel", () => {
    it('should return "Sí" for true', () => {
      const result = formatBooleanForExcel(true);
      expect(result).toBe("Sí");
    });

    it('should return "No" for false', () => {
      const result = formatBooleanForExcel(false);
      expect(result).toBe("No");
    });

    it("should handle null", () => {
      const result = formatBooleanForExcel(null as any);
      expect(result).toBe("");
    });

    it("should handle undefined", () => {
      const result = formatBooleanForExcel(undefined as any);
      expect(result).toBe("");
    });
  });

  describe("exportToExcel", () => {
    it("should generate Excel buffer with data", () => {
      const data = [
        { id: 1, nombre: "Juan", activo: true },
        { id: 2, nombre: "Maria", activo: false },
      ];

      const columns = [
        { key: "id", header: "ID", width: 10 },
        { key: "nombre", header: "Nombre", width: 20 },
        { key: "activo", header: "Activo", width: 15, format: formatBooleanForExcel },
      ];

      const buffer = exportToExcel(data, columns, {
        sheetName: "Test",
        filename: "test.xlsx",
      });

      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should handle empty data array", () => {
      const columns = [{ key: "id", header: "ID", width: 10 }];

      const buffer = exportToExcel([], columns, {
        filename: "empty.xlsx",
      });

      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should apply custom formatters", () => {
      const data = [{ precio: 1500.5, fecha: "2024-01-15" }];

      const columns = [
        {
          key: "precio",
          header: "Precio",
          width: 15,
          format: formatCurrencyForExcel,
        },
        {
          key: "fecha",
          header: "Fecha",
          width: 15,
          format: formatDateForExcel,
        },
      ];

      const buffer = exportToExcel(data, columns, {
        filename: "test.xlsx",
      });

      expect(buffer).toBeInstanceOf(Uint8Array);
    });

    it("should use custom sheet name", () => {
      const data = [{ id: 1 }];
      const columns = [{ key: "id", header: "ID", width: 10 }];

      const buffer = exportToExcel(data, columns, {
        sheetName: "CustomSheet",
        filename: "custom.xlsx",
      });

      expect(buffer).toBeInstanceOf(Uint8Array);
    });
  });
});
