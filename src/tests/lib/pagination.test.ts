import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import {
  getPaginationParams,
  getPaginationOffset,
  createPaginatedData,
  createPaginationMeta,
  getTotalCount,
} from "@/lib/pagination";

// Mock the db module
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}));

describe("Pagination Utilities", () => {
  describe("getPaginationParams", () => {
    it("should extract pagination params from request", () => {
      const req = new NextRequest("http://localhost:3000/api/users?page=2&limit=25&sortBy=name&sortOrder=desc");

      const params = getPaginationParams(req);

      expect(params.page).toBe(2);
      expect(params.limit).toBe(25);
      expect(params.sortBy).toBe("name");
      expect(params.sortOrder).toBe("desc");
    });

    it("should use default values when params are missing", () => {
      const req = new NextRequest("http://localhost:3000/api/users");

      const params = getPaginationParams(req);

      expect(params.page).toBe(1);
      expect(params.limit).toBe(50); // Default is 50
      expect(params.sortBy).toBeUndefined();
      expect(params.sortOrder).toBe("desc");
    });

    it("should throw error for page less than 1", () => {
      const req = new NextRequest("http://localhost:3000/api/users?page=0");

      expect(() => getPaginationParams(req)).toThrow();
    });

    it("should throw error for limit less than 1", () => {
      const req = new NextRequest("http://localhost:3000/api/users?limit=0");

      expect(() => getPaginationParams(req)).toThrow();
    });

    it("should throw error for limit greater than 100", () => {
      const req = new NextRequest("http://localhost:3000/api/users?limit=500");

      expect(() => getPaginationParams(req)).toThrow();
    });
  });

  describe("getPaginationOffset", () => {
    it("should calculate offset for page 1", () => {
      const offset = getPaginationOffset(1, 10);

      expect(offset).toBe(0);
    });

    it("should calculate offset for page 2", () => {
      const offset = getPaginationOffset(2, 10);

      expect(offset).toBe(10);
    });

    it("should calculate offset for page 5 with limit 25", () => {
      const offset = getPaginationOffset(5, 25);

      expect(offset).toBe(100);
    });

    it("should handle page 1 with any limit", () => {
      expect(getPaginationOffset(1, 5)).toBe(0);
      expect(getPaginationOffset(1, 50)).toBe(0);
      expect(getPaginationOffset(1, 100)).toBe(0);
    });
  });

  describe("createPaginatedData", () => {
    it("should create paginated data object", () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const page = 1;
      const limit = 10;
      const total = 50;

      const result = createPaginatedData(data, page, limit, total);

      expect(result.data).toEqual(data);
      expect(result.pagination.page).toBe(page);
      expect(result.pagination.limit).toBe(limit);
      expect(result.pagination.total).toBe(total);
      expect(result.pagination.totalPages).toBe(5);
    });

    it("should calculate total pages correctly", () => {
      const data: unknown[] = [];

      // 100 items with limit 25 = 4 pages
      const result1 = createPaginatedData(data, 1, 25, 100);
      expect(result1.pagination.totalPages).toBe(4);

      // 101 items with limit 25 = 5 pages
      const result2 = createPaginatedData(data, 1, 25, 101);
      expect(result2.pagination.totalPages).toBe(5);

      // 0 items = 0 pages
      const result3 = createPaginatedData(data, 1, 25, 0);
      expect(result3.pagination.totalPages).toBe(0);
    });

    it("should work with different page numbers", () => {
      const data = [{ id: 11 }, { id: 12 }];
      const result = createPaginatedData(data, 3, 10, 50);

      expect(result.pagination.page).toBe(3);
    });
  });

  describe("createPaginationMeta", () => {
    it("should create pagination metadata with hasNextPage true", () => {
      const meta = createPaginationMeta(1, 10, 50);

      expect(meta.page).toBe(1);
      expect(meta.limit).toBe(10);
      expect(meta.total).toBe(50);
      expect(meta.totalPages).toBe(5);
      expect(meta.hasNextPage).toBe(true);
      expect(meta.hasPrevPage).toBe(false);
    });

    it("should create pagination metadata with hasPrevPage true", () => {
      const meta = createPaginationMeta(3, 10, 50);

      expect(meta.page).toBe(3);
      expect(meta.hasNextPage).toBe(true);
      expect(meta.hasPrevPage).toBe(true);
    });

    it("should create pagination metadata for last page", () => {
      const meta = createPaginationMeta(5, 10, 50);

      expect(meta.page).toBe(5);
      expect(meta.totalPages).toBe(5);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPrevPage).toBe(true);
    });

    it("should handle single page", () => {
      const meta = createPaginationMeta(1, 10, 5);

      expect(meta.totalPages).toBe(1);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPrevPage).toBe(false);
    });

    it("should handle empty results", () => {
      const meta = createPaginationMeta(1, 10, 0);

      expect(meta.totalPages).toBe(0);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPrevPage).toBe(false);
    });
  });

  describe("getTotalCount", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should get total count from table", async () => {
      const mockTable = {} as any;

      const db = await import("@/lib/db");

      // Create an awaitable query that returns [{ count: 42 }]
      const awaitableQuery = Promise.resolve([{ count: 42 }]) as any;
      awaitableQuery.where = vi.fn().mockReturnThis();

      const mockFrom = vi.fn().mockReturnValue(awaitableQuery);
      vi.mocked(db.db.select).mockReturnValue({ from: mockFrom } as any);

      const count = await getTotalCount(mockTable);

      expect(db.db.select).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith(mockTable);
      expect(count).toBe(42);
    });

    it("should get total count with where clause", async () => {
      const mockTable = {} as any;
      const mockWhere = {} as any;

      const db = await import("@/lib/db");

      // Create an awaitable query with where method
      const awaitableQuery = Promise.resolve([{ count: 10 }]) as any;
      awaitableQuery.where = vi.fn().mockReturnValue(Promise.resolve([{ count: 10 }]));

      const mockFrom = vi.fn().mockReturnValue(awaitableQuery);
      vi.mocked(db.db.select).mockReturnValue({ from: mockFrom } as any);

      const count = await getTotalCount(mockTable, mockWhere);

      expect(awaitableQuery.where).toHaveBeenCalledWith(mockWhere);
      expect(count).toBe(10);
    });

    it("should return 0 when result is undefined", async () => {
      const mockTable = {} as any;

      const db = await import("@/lib/db");

      // Create an awaitable query that returns empty array
      const awaitableQuery = Promise.resolve([]) as any;
      awaitableQuery.where = vi.fn().mockReturnThis();

      const mockFrom = vi.fn().mockReturnValue(awaitableQuery);
      vi.mocked(db.db.select).mockReturnValue({ from: mockFrom } as any);

      const count = await getTotalCount(mockTable);

      expect(count).toBe(0);
    });
  });
});
