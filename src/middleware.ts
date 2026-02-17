import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { jwtVerify } from "jose";

import { middlewareLogger } from "./lib/logger";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-this-in-production");

// Routes that require authentication
const protectedRoutes = ["/dashboard"];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ["/auth"];

// Lightweight JWT verification for Edge Runtime (using jose)
async function verifyTokenEdge(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    middlewareLogger.debug("Token verified successfully", { userId: payload.userId });
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    middlewareLogger.warn("Token verification failed", { error: errorMessage });
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookie
  const token = request.cookies.get("auth-token")?.value;

  middlewareLogger.debug("Processing request", { pathname, hasToken: !!token });

  // Verify token (lightweight, no DB access)
  const isAuthenticated = token ? await verifyTokenEdge(token) : false;

  middlewareLogger.debug("Authentication status", { isAuthenticated });

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // Check if current path is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect to login if accessing protected route without authentication
  if (isProtectedRoute && !isAuthenticated) {
    middlewareLogger.info("Redirecting to login - protected route without auth", { pathname });
    const loginUrl = new URL("/auth/v2/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if accessing auth routes while authenticated
  if (isAuthRoute && isAuthenticated) {
    middlewareLogger.info("Redirecting to dashboard - already authenticated", { pathname });
    return NextResponse.redirect(new URL("/dashboard/crm", request.url));
  }

  middlewareLogger.debug("Allowing access", { pathname });
  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
