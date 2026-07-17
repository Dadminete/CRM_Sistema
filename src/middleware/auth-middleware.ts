import { NextResponse, type NextRequest } from "next/server";

const LOGIN_PATH = "/auth/v2/login";
const DASHBOARD_PATH = "/dashboard/crm";

export function authMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLoggedIn = req.cookies.get("auth-token");

  if (!isLoggedIn && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL(LOGIN_PATH, req.url));
  }

  if (isLoggedIn && pathname === "/auth/login") {
    return NextResponse.redirect(new URL(DASHBOARD_PATH, req.url));
  }

  if (isLoggedIn && pathname === LOGIN_PATH) {
    return NextResponse.redirect(new URL(DASHBOARD_PATH, req.url));
  }

  return NextResponse.next();
}
