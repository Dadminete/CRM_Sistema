import { NextRequest, NextResponse } from "next/server";

import { jwtVerify } from "jose";

import { middlewareLogger } from "./lib/logger";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-this-in-production");
const protectedRoutes = ["/dashboard"];
const authRoutes = ["/auth"];

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth-token")?.value;
  const isAuthenticated = token ? await verifyTokenEdge(token) : false;
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/auth/v2/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard/crm", request.url));
  }

  const response = NextResponse.next();
  const origin = request.headers.get("origin") || "*";
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
  response.headers.set("Access-Control-Allow-Credentials", "true");

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  return response;
}
