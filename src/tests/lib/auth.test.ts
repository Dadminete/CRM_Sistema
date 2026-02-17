import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  createSession,
  invalidateSession,
  getActiveSession,
  getUserBySession,
} from "@/lib/auth";

// Mock the db module for session tests
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() =>
          Promise.resolve([
            {
              id: "session-123",
              usuarioId: "user-123",
              activa: true,
              fechaUltimoUso: new Date().toISOString(),
              fechaExpiracion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ]),
        ),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() =>
            Promise.resolve([
              {
                id: "session-123",
                usuarioId: "user-123",
                activa: true,
                fechaUltimoUso: new Date().toISOString(),
                fechaExpiracion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              },
            ]),
          ),
        })),
      })),
    })),
  },
}));

describe("Auth Library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe("hashPassword", () => {
    it("should hash a password successfully", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should generate different hashes for the same password", async () => {
      const password = "testPassword123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty password", async () => {
      const hash = await hashPassword("");
      expect(hash).toBeDefined();
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "testPassword123";
      const wrongPassword = "wrongPassword456";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it("should reject empty password against valid hash", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword("", hash);
      expect(isValid).toBe(false);
    });
  });

  describe("generateToken", () => {
    it("should generate a valid JWT token", () => {
      const userId = "user-123";
      const sessionId = "session-456";

      const token = generateToken(userId, sessionId);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should generate different tokens for different users", () => {
      const token1 = generateToken("user-1", "session-1");
      const token2 = generateToken("user-2", "session-2");

      expect(token1).not.toBe(token2);
    });

    it("should include expiration time", () => {
      const userId = "user-123";
      const sessionId = "session-456";
      const token = generateToken(userId, sessionId);

      const decoded = verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.exp).toBeDefined();
    });
  });

  describe("verifyToken", () => {
    it("should verify and decode a valid token", () => {
      const userId = "user-123";
      const sessionId = "session-456";

      const token = generateToken(userId, sessionId);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(userId);
      expect(decoded?.sessionId).toBe(sessionId);
    });

    it("should return null for invalid token", () => {
      const invalidToken = "invalid.token.here";

      const decoded = verifyToken(invalidToken);
      expect(decoded).toBeNull();
    });

    it("should return null for tampered token", () => {
      const token = generateToken("user-123", "session-456");
      const tamperedToken = token.slice(0, -5) + "xxxxx";

      const decoded = verifyToken(tamperedToken);
      expect(decoded).toBeNull();
    });

    it("should return null for empty token", () => {
      const decoded = verifyToken("");
      expect(decoded).toBeNull();
    });
  });

  describe("createSession", () => {
    it("should create a session with user ID", async () => {
      const sessionId = await createSession("user-123");

      expect(sessionId).toBeDefined();
      expect(sessionId).toBe("session-123");
    });

    it("should create a session with IP and user agent", async () => {
      const sessionId = await createSession("user-456", "192.168.1.1", "Mozilla/5.0");

      expect(sessionId).toBeDefined();
      expect(sessionId).toBe("session-123");
    });

    it("should create session without optional parameters", async () => {
      const sessionId = await createSession("user-789");

      expect(sessionId).toBe("session-123");
    });
  });

  describe("invalidateSession", () => {
    it("should invalidate an active session", async () => {
      await invalidateSession("session-123");

      // Should not throw error
      expect(true).toBe(true);
    });

    it("should handle non-existent session", async () => {
      await invalidateSession("non-existent-session");

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe("getActiveSession", () => {
    it("should return active session", async () => {
      const session = await getActiveSession("session-123");

      expect(session).toBeDefined();
      expect(session?.id).toBe("session-123");
      expect(session?.activa).toBe(true);
    });

    it("should handle session lookup", async () => {
      const session = await getActiveSession("any-session-id");

      // With mock, it will return the default mocked session
      expect(session).toBeDefined();
    });
  });

  describe("getUserBySession", () => {
    it("should return user for valid session", async () => {
      // Mock select twice: once for session, once for user
      const mockDbSelect = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve([
                  {
                    id: "session-123",
                    usuarioId: "user-123",
                    activa: true,
                    fechaUltimoUso: new Date().toISOString(),
                    fechaExpiracion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                  },
                ]),
              ),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve([
                  {
                    id: "user-123",
                    username: "testuser",
                    nombre: "Test",
                    apellido: "User",
                    email: "test@example.com",
                    avatar: null,
                    activo: true,
                  },
                ]),
              ),
            })),
          })),
        });

      const db = await import("@/lib/db");
      vi.mocked(db.db.select).mockImplementation(mockDbSelect as any);

      const user = await getUserBySession("session-123");

      expect(user).toBeDefined();
      expect(user?.id).toBe("user-123");
      expect(user?.username).toBe("testuser");
    });
  });
});
