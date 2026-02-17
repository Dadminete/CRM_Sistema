import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (for development)
// In production, use Redis or Upstash
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 10 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  },
  10 * 60 * 1000,
);

export interface RateLimitOptions {
  /** Maximum number of requests allowed in the time window */
  limit: number;
  /** Time window in milliseconds */
  window: number;
  /** Custom identifier (defaults to IP address) */
  identifier?: (req: NextRequest) => string;
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(req: NextRequest): string {
  // Try to get real IP from headers (for proxies/load balancers)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to a generic identifier
  return "unknown";
}

/**
 * Rate limit middleware
 */
export function rateLimit(options: RateLimitOptions) {
  const { limit, window, identifier = getClientIdentifier } = options;

  return async (req: NextRequest): Promise<NextResponse | null> => {
    const key = identifier(req);
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + window,
      };
      rateLimitStore.set(key, entry);
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > limit) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      return NextResponse.json(
        {
          success: false,
          error: "Demasiadas solicitudes. Por favor, intenta más tarde.",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(entry.resetTime).toISOString(),
          },
        },
      );
    }

    // Add rate limit headers to response
    const remaining = limit - entry.count;

    return null; // Continue to handler
  };
}

/**
 * Wrapper to apply rate limiting to a route handler
 */
export function withRateLimit<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  options: RateLimitOptions,
): T {
  return (async (...args: any[]) => {
    const req = args[0] as NextRequest;

    // Apply rate limit
    const rateLimitResponse = await rateLimit(options)(req);

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Continue to handler
    return handler(...args);
  }) as T;
}

/**
 * Common rate limit configurations
 */
export const RateLimits = {
  /** Strict limit for authentication endpoints */
  auth: {
    limit: 5,
    window: 15 * 60 * 1000, // 15 minutes
  },

  /** Standard limit for read operations */
  read: {
    limit: 100,
    window: 10 * 60 * 1000, // 10 minutes
  },

  /** Stricter limit for write operations */
  write: {
    limit: 30,
    window: 10 * 60 * 1000, // 10 minutes
  },

  /** Very strict limit for sensitive operations */
  sensitive: {
    limit: 10,
    window: 60 * 60 * 1000, // 1 hour
  },
};
