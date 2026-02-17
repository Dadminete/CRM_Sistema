/**
 * Rate limiting middleware wrapper
 * Applies rate limiting to API routes
 */

import { NextRequest, NextResponse } from "next/server";

import { errorResponse } from "./api-response";
import { checkRateLimit } from "./rate-limit";

interface RateLimitOptions {
  requests: number;
  window: number;
}

/**
 * Wrap an API handler with rate limiting
 */
export function withRateLimit<T extends(req: NextRequest, ...args: unknown[]) => Promise<NextResponse>>(
  handler: T,
  options: RateLimitOptions = { requests: 100, window: 60000 },
): T {
  return (async (req: NextRequest, ...args: unknown[]) => {
    // Get identifier (IP or user ID from cookie)
    const identifier = req.ip || req.headers.get("x-forwarded-for") || "anonymous";

    // Check rate limit
    const rateLimitResult = await checkRateLimit(identifier, options.requests, options.window);

    if (!rateLimitResult.success) {
      return errorResponse(
        `Too many requests. Please try again in ${Math.ceil(rateLimitResult.resetIn / 1000)} seconds.`,
        429,
      );
    }

    // Call the original handler
    return handler(req, ...args);
  }) as T;
}

/**
 * Stricter rate limiting for sensitive operations
 */
export function withStrictRateLimit<T extends(req: NextRequest, ...args: unknown[]) => Promise<NextResponse>>(
  handler: T,
): T {
  return withRateLimit(handler, { requests: 10, window: 60000 }); // 10 requests per minute
}

/**
 * Lenient rate limiting for public endpoints
 */
export function withLenientRateLimit<T extends(req: NextRequest, ...args: unknown[]) => Promise<NextResponse>>(
  handler: T,
): T {
  return withRateLimit(handler, { requests: 300, window: 60000 }); // 300 requests per minute
}
