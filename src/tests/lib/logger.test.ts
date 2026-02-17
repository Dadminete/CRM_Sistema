import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { logger, authLogger, apiLogger, dbLogger, middlewareLogger } from "@/lib/logger";

describe("Logger", () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("info", () => {
    it("should not throw with message only", () => {
      expect(() => logger.info("Test message")).not.toThrow();
    });

    it("should accept message with data", () => {
      expect(() => logger.info("Test info", { userId: "123" })).not.toThrow();
    });

    it("should accept message with context", () => {
      expect(() => logger.info("Test", undefined, "AUTH")).not.toThrow();
    });
  });

  describe("warn", () => {
    it("should accept warning messages", () => {
      expect(() => logger.warn("Test warning")).not.toThrow();
    });

    it("should accept warning with data", () => {
      expect(() => logger.warn("Warning", { feature: "oldAPI" })).not.toThrow();
    });
  });

  describe("error", () => {
    it("should accept error messages", () => {
      expect(() => logger.error("Error occurred", new Error("Test"))).not.toThrow();
    });

    it("should handle non-Error objects", () => {
      expect(() => logger.error("String error", "Something wrong")).not.toThrow();
    });

    it("should accept error with all parameters", () => {
      expect(() => logger.error("DB error", new Error("fail"), { query: "SELECT" }, "DB")).not.toThrow();
    });
  });

  describe("debug", () => {
    it("should accept debug messages", () => {
      expect(() => logger.debug("Debug info")).not.toThrow();
    });

    it("should accept debug with data", () => {
      expect(() => logger.debug("Debug", { step: 1 })).not.toThrow();
    });
  });

  describe("context", () => {
    it("should create context logger", () => {
      const contextLogger = logger.context("TEST");
      expect(contextLogger).toBeDefined();
      expect(contextLogger.info).toBeDefined();
      expect(contextLogger.warn).toBeDefined();
      expect(contextLogger.error).toBeDefined();
      expect(contextLogger.debug).toBeDefined();
    });

    it("should use context logger methods", () => {
      const ctx = logger.context("TEST");
      expect(() => {
        ctx.info("info");
        ctx.warn("warn");
        ctx.error("error", new Error("test"));
        ctx.debug("debug");
      }).not.toThrow();
    });
  });

  describe("exported context loggers", () => {
    it("should have authLogger available", () => {
      expect(authLogger).toBeDefined();
      expect(authLogger.info).toBeDefined();
    });

    it("should have apiLogger available", () => {
      expect(apiLogger).toBeDefined();
    });

    it("should have dbLogger available", () => {
      expect(dbLogger).toBeDefined();
    });

    it("should have middlewareLogger available", () => {
      expect(middlewareLogger).toBeDefined();
    });

    it("should use authLogger", () => {
      expect(() => authLogger.info("Auth message")).not.toThrow();
    });

    it("should use apiLogger", () => {
      expect(() => apiLogger.warn("API warning")).not.toThrow();
    });

    it("should use dbLogger", () => {
      expect(() => dbLogger.error("DB error", new Error("fail"))).not.toThrow();
    });

    it("should use middlewareLogger", () => {
      expect(() => middlewareLogger.debug("Middleware debug")).not.toThrow();
    });
  });

  describe("all log levels", () => {
    it("should handle all log levels without errors", () => {
      expect(() => {
        logger.info("Info");
        logger.warn("Warning");
        logger.error("Error", new Error("test"));
        logger.debug("Debug");
      }).not.toThrow();
    });

    it("should handle context loggers for all levels", () => {
      expect(() => {
        authLogger.info("Auth info");
        apiLogger.warn("API warn");
        dbLogger.error("DB error", new Error("test"));
        middlewareLogger.debug("MW debug");
      }).not.toThrow();
    });
  });
});
