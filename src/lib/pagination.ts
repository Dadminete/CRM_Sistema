import { NextRequest } from "next/server";

import { SQL, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { z } from "zod";

import { db } from "@/lib/db";

/**
 * Pagination parameters schema
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().default(1)),
  limit: z
    .string()
    .optional()
    .default("50")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(2000).default(50)),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Extract and validate pagination parameters from request
 */
export function getPaginationParams(req: NextRequest): PaginationParams {
  const searchParams = req.nextUrl.searchParams;

  const params = {
    page: searchParams.get("page") ?? "1",
    limit: searchParams.get("limit") ?? "50",
    sortBy: searchParams.get("sortBy") ?? undefined,
    sortOrder: (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc",
  };

  const validated = paginationSchema.parse(params);
  return validated;
}

/**
 * Calculate pagination offset
 */
export function getPaginationOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Get total count for a table with optional where clause
 */
export async function getTotalCount(table: PgTable, where?: SQL): Promise<number> {
  const query = db.select({ count: sql<number>`count(*)::int` }).from(table);

  if (where) {
    query.where(where);
  }

  const [result] = await query;
  return result?.count ?? 0;
}

/**
 * Paginated response helper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Create a paginated response
 */
export function createPaginatedData<T>(data: T[], page: number, limit: number, total: number): PaginatedResponse<T> {
  return {
    data,
    pagination: createPaginationMeta(page, limit, total),
  };
}
