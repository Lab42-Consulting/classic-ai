import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

// Request body size limits (in bytes)
const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB default
const MAX_IMAGE_UPLOAD_SIZE = 2 * 1024 * 1024; // 2MB for image uploads

// Routes that handle image uploads (may have larger payloads)
const imageUploadPaths = [
  "/api/member/avatar",
  "/api/member/meals",
  "/api/gym/branding",
  "/api/logs",
];

const publicPaths = [
  "/login",
  "/staff-login",
  "/api/auth/login",
  "/api/auth/staff-login",
  "/api/gyms",
  "/gym-portal",
  "/api/gym/register",
  "/api/stripe",
  "/unavailable",
];

const memberPaths = ["/home", "/log", "/checkin", "/chat", "/history"];
const staffPaths = ["/dashboard", "/members", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check request body size for POST/PUT/PATCH requests
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    const contentLength = request.headers.get("content-length");
    if (contentLength) {
      const size = parseInt(contentLength, 10);

      // Determine max size based on route
      const isImageUpload = imageUploadPaths.some((path) =>
        pathname.startsWith(path)
      );
      const maxSize = isImageUpload ? MAX_IMAGE_UPLOAD_SIZE : MAX_BODY_SIZE;

      if (size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        return NextResponse.json(
          { error: `Request too large. Max ${maxSizeMB}MB allowed.` },
          { status: 413 }
        );
      }
    }
  }

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

  // Staff can access member paths if they have a linked member account
  // The actual check happens at the page level
  if (isMemberPath && session.userType !== "member" && session.userType !== "staff") {
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
