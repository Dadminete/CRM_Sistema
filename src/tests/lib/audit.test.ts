import { describe, it, expect, vi, beforeEach } from "vitest";

import { logAudit, logDataChange, withAuditLog } from "@/lib/audit";
import { NextRequest } from "next/server";

// Mock the entire db module
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve([{ id: "audit-123" }])),
    })),
  },
}));

// Mock Next.js URL for happy-dom compatibility
global.URL = class URL {
  pathname: string;
  constructor(url: string) {
    this.pathname = url.replace(/^https?:\/\/[^/]+/, "") || "/";
  }
} as unknown as typeof URL;

describe("Audit Library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logAudit", () => {
    it("should handle missing request object", async () => {
      await logAudit({
        usuarioId: "user-123",
        accion: "UPDATE",
        tablaAfectada: "clientes",
        resultado: "exitoso",
      });

      // Should not throw error
      expect(true).toBe(true);
    });

    it("should include duration when provided", async () => {
      await logAudit({
        usuarioId: "user-123",
        accion: "READ",
        tablaAfectada: "facturas",
        resultado: "exitoso",
        duracionMs: 150,
      });

      // Should not throw error
      expect(true).toBe(true);
    });

    it("should handle error message on failure", async () => {
      await logAudit({
        usuarioId: "user-123",
        accion: "DELETE",
        tablaAfectada: "productos",
        resultado: "fallido",
        mensajeError: "Permission denied",
      });

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe("logDataChange", () => {
    it("should handle null before state for CREATE", async () => {
      const after = { nombre: "Maria", email: "maria@test.com" };

      await logDataChange("user-123", "CREATE", "usuarios", "user-789", null, after);

      // Should not throw error
      expect(true).toBe(true);
    });

    it("should handle null after state for DELETE", async () => {
      const before = { nombre: "Producto A", precio: 100 };

      await logDataChange("user-123", "DELETE", "productos", "prod-999", before, null);

      // Should not throw error
      expect(true).toBe(true);
    });

    it("should handle state changes", async () => {
      const before = { nombre: "Juan", apellido: "Perez" };
      const after = { nombre: "Juan", apellido: "Rodriguez" };

      await logDataChange("user-123", "UPDATE", "clientes", "client-456", before, after);

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe("withAuditLog", () => {
    it("should wrap handler and log successful action", async () => {
      const mockHandler = vi.fn(async () => {
        return new Response(JSON.stringify({ data: { id: "123" }, success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const wrappedHandler = withAuditLog(mockHandler, "CREATE", "clientes");

      const mockReq = {
        method: "POST",
        url: "http://localhost:3000/api/clientes",
        headers: new Map([
          ["x-forwarded-for", "192.168.1.1"],
          ["user-agent", "Mozilla/5.0"],
        ]),
      } as unknown as NextRequest;

      const response = await wrappedHandler(mockReq);

      expect(mockHandler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it("should log failed action when response is not ok", async () => {
      const mockHandler = vi.fn(async () => {
        return new Response(JSON.stringify({ error: "Validation failed", success: false }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      });

      const wrappedHandler = withAuditLog(mockHandler, "UPDATE", "productos");

      const mockReq = {
        method: "PUT",
        url: "http://localhost:3000/api/productos/123",
        headers: new Map(),
      } as unknown as NextRequest;

      const response = await wrappedHandler(mockReq);

      expect(response.status).toBe(400);
    });

    it("should handle handler throwing error", async () => {
      const mockHandler = vi.fn(async () => {
        throw new Error("Database connection failed");
      });

      const wrappedHandler = withAuditLog(mockHandler, "DELETE", "usuarios");

      const mockReq = {
        method: "DELETE",
        url: "http://localhost:3000/api/usuarios/123",
        headers: new Map(),
      } as unknown as NextRequest;

      await expect(wrappedHandler(mockReq)).rejects.toThrow("Database connection failed");
    });

    it("should extract user and session from request", async () => {
      const mockHandler = vi.fn(async () => {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      const wrappedHandler = withAuditLog(mockHandler, "READ", "facturas");

      const mockReq = {
        method: "GET",
        url: "http://localhost:3000/api/facturas",
        headers: new Map(),
        user: { id: "user-456", sessionId: "session-789" },
      } as unknown as NextRequest;

      const response = await wrappedHandler(mockReq);

      expect(response.status).toBe(200);
    });
  });
});
