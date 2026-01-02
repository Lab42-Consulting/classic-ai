import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

const COOKIE_NAME = "gym-session";
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface SessionPayload {
  userId: string;
  userType: "member" | "staff";
  gymId: string;
  exp?: number;
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export async function createSession(payload: Omit<SessionPayload, "exp">): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);

  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (
      typeof payload.userId === "string" &&
      (payload.userType === "member" || payload.userType === "staff") &&
      typeof payload.gymId === "string"
    ) {
      return {
        userId: payload.userId,
        userType: payload.userType,
        gymId: payload.gymId,
        exp: payload.exp,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  return verifySession(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION / 1000,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function generateMemberId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function generateStaffId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "S-";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Result from getMemberFromSession - contains member info for API authorization
 */
export interface MemberAuthResult {
  memberId: string;
  gymId: string;
  isStaffMember: boolean; // true if this is a staff member using their linked member account
}

/**
 * Error codes for member authentication failures
 */
export type MemberAuthError =
  | "NO_SESSION"
  | "STAFF_NO_LINKED_MEMBER"
  | "INVALID_USER_TYPE";

/**
 * Get member info from session - supports both regular members and staff with linked member accounts.
 *
 * This is the primary authentication helper for all member-facing API routes.
 * It handles the dual-role case where a coach/admin has a linked member account.
 *
 * @returns MemberAuthResult on success, or { error: MemberAuthError } on failure
 */
export async function getMemberFromSession(): Promise<
  MemberAuthResult | { error: MemberAuthError }
> {
  // Import prisma here to avoid circular dependency issues
  const { prisma } = await import("@/lib/db");

  const session = await getSession();

  if (!session) {
    return { error: "NO_SESSION" };
  }

  // Regular member - straightforward case
  if (session.userType === "member") {
    return {
      memberId: session.userId,
      gymId: session.gymId,
      isStaffMember: false,
    };
  }

  // Staff user - check for linked member account
  if (session.userType === "staff") {
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { linkedMemberId: true },
    });

    if (!staff?.linkedMemberId) {
      return { error: "STAFF_NO_LINKED_MEMBER" };
    }

    return {
      memberId: staff.linkedMemberId,
      gymId: session.gymId,
      isStaffMember: true,
    };
  }

  return { error: "INVALID_USER_TYPE" };
}

/**
 * Get human-readable error message for member auth errors (Serbian)
 */
export function getMemberAuthErrorMessage(error: MemberAuthError): string {
  switch (error) {
    case "NO_SESSION":
      return "Niste prijavljeni. Molimo prijavite se ponovo.";
    case "STAFF_NO_LINKED_MEMBER":
      return "Nemate povezan članski nalog. Kreirajte ga u podešavanjima.";
    case "INVALID_USER_TYPE":
      return "Nemate pristup ovoj funkciji.";
    default:
      return "Došlo je do greške pri autorizaciji.";
  }
}
