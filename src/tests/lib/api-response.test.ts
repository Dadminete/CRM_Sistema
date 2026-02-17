import { describe, it, expect } from "vitest";

import {
  successResponse,
  errorResponse,
  paginatedResponse,
  CommonErrors,
  ApiSuccessResponse,
  ApiErrorResponse,
} from "@/lib/api-response";

describe("API Response Utilities", () => {
  describe("successResponse", () => {
    it("should create a success response with data", () => {
      const data = { id: 1, name: "Test" };
      const response = successResponse(data);

      expect(response.status).toBe(200);
      const json = response.json() as Promise<ApiSuccessResponse<typeof data>>;
      json.then((body) => {
        expect(body.success).toBe(true);
        expect(body.data).toEqual(data);
      });
    });

    it("should create a success response with custom status", () => {
      const data = { created: true };
      const response = successResponse(data, undefined, 201);

      expect(response.status).toBe(201);
    });

    it("should include metadata when provided", () => {
      const data = [1, 2, 3];
      const meta = { total: 3, page: 1 };
      const response = successResponse(data, meta);

      const json = response.json() as Promise<ApiSuccessResponse<typeof data>>;
      json.then((body) => {
        expect(body.meta).toEqual(meta);
      });
    });
  });

  describe("errorResponse", () => {
    it("should create an error response", () => {
      const message = "Something went wrong";
      const response = errorResponse(message);

      expect(response.status).toBe(400);
      const json = response.json() as Promise<ApiErrorResponse>;
      json.then((body) => {
        expect(body.success).toBe(false);
        expect(body.error).toBe(message);
      });
    });

    it("should create an error response with custom status", () => {
      const message = "Not found";
      const response = errorResponse(message, 404);

      expect(response.status).toBe(404);
    });

    it("should include details when provided", () => {
      const message = "Validation failed";
      const details = { field: "email", error: "Invalid format" };
      const response = errorResponse(message, 400, details);

      const json = response.json() as Promise<ApiErrorResponse>;
      json.then((body) => {
        expect(body.details).toEqual(details);
      });
    });
  });

  describe("paginatedResponse", () => {
    it("should create a paginated response", () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const response = paginatedResponse(data, 1, 10, 100);

      expect(response.status).toBe(200);
      const json = response.json() as Promise<ApiSuccessResponse<typeof data>>;
      json.then((body) => {
        expect(body.success).toBe(true);
        expect(body.data).toEqual(data);
        expect(body.meta?.pagination).toEqual({
          page: 1,
          limit: 10,
          total: 100,
          totalPages: 10,
        });
      });
    });

    it("should calculate total pages correctly", () => {
      const data: unknown[] = [];
      const response = paginatedResponse(data, 2, 25, 60);

      const json = response.json() as Promise<ApiSuccessResponse<unknown[]>>;
      json.then((body) => {
        expect(body.meta?.pagination?.totalPages).toBe(3);
      });
    });
  });

  describe("CommonErrors", () => {
    it("should create unauthorized error", () => {
      const response = CommonErrors.unauthorized();

      expect(response.status).toBe(401);
      const json = response.json() as Promise<ApiErrorResponse>;
      json.then((body) => {
        expect(body.error).toContain("autenticado");
      });
    });

    it("should create forbidden error", () => {
      const response = CommonErrors.forbidden();

      expect(response.status).toBe(403);
    });

    it("should create forbidden error with required permission", () => {
      const response = CommonErrors.forbidden("admin");

      expect(response.headers.get("X-Required-Permission")).toBe("admin");
    });

    it("should create not found error", () => {
      const response = CommonErrors.notFound("Usuario");

      expect(response.status).toBe(404);
      const json = response.json() as Promise<ApiErrorResponse>;
      json.then((body) => {
        expect(body.error).toContain("Usuario");
      });
    });

    it("should create bad request error", () => {
      const response = CommonErrors.badRequest("Invalid input");

      expect(response.status).toBe(400);
      const json = response.json() as Promise<ApiErrorResponse>;
      json.then((body) => {
        expect(body.error).toBe("Invalid input");
      });
    });

    it("should create conflict error", () => {
      const response = CommonErrors.conflict("User already exists");

      expect(response.status).toBe(409);
    });

    it("should create internal error", () => {
      const response = CommonErrors.internalError();

      expect(response.status).toBe(500);
    });

    it("should create validation error", () => {
      const details = { email: "required" };
      const response = CommonErrors.validationError(details);

      expect(response.status).toBe(400);
      const json = response.json() as Promise<ApiErrorResponse>;
      json.then((body) => {
        expect(body.details).toEqual(details);
      });
    });
  });
});
