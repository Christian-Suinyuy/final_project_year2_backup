import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  // 1. Public routes
  if (
    pathname.startsWith("/auth") ||
    pathname === "/" ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // 2. Authentication check
  if (!token) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  // 3. Multi-tenant check for Dashboard
  if (pathname.startsWith("/dashboard")) {
    if (!token.businessId) {
      // User is logged in but has no business. Send them to onboarding.
      return NextResponse.redirect(new URL("/auth/onboarding", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/onboarding"],
};
