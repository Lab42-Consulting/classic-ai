import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

const publicPaths = [
  "/login",
  "/staff-login",
  "/api/auth/login",
  "/api/auth/staff-login",
  "/api/gyms",
];

const memberPaths = ["/home", "/log", "/checkin", "/chat", "/history"];
const staffPaths = ["/dashboard", "/members", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static files and all API routes (they handle their own auth)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Get session from cookie
  const token = request.cookies.get("gym-session")?.value;

  if (!token) {
    // Redirect to login based on path
    if (staffPaths.some((path) => pathname.startsWith(path))) {
      return NextResponse.redirect(new URL("/staff-login", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifySession(token);

  if (!session) {
    // Invalid session, clear and redirect
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("gym-session");
    return response;
  }

  // Check role-based access
  const isMemberPath = memberPaths.some((path) => pathname.startsWith(path));
  const isStaffPath = staffPaths.some((path) => pathname.startsWith(path));

  if (isMemberPath && session.userType !== "member") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isStaffPath && session.userType !== "staff") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Redirect root to appropriate home
  if (pathname === "/") {
    if (session.userType === "staff") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
