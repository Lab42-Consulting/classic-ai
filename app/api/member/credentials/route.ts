import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";

// Rate limiting: track failed attempts per member
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(memberId: string): { allowed: boolean; remainingTime?: number } {
  const now = Date.now();
  const attempts = failedAttempts.get(memberId);

  if (!attempts) return { allowed: true };

  // Reset if lockout period has passed
  if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
    failedAttempts.delete(memberId);
    return { allowed: true };
  }

  if (attempts.count >= MAX_ATTEMPTS) {
    const remainingTime = Math.ceil((LOCKOUT_DURATION - (now - attempts.lastAttempt)) / 1000);
    return { allowed: false, remainingTime };
  }

  return { allowed: true };
}

function recordFailedAttempt(memberId: string) {
  const now = Date.now();
  const attempts = failedAttempts.get(memberId);

  if (!attempts) {
    failedAttempts.set(memberId, { count: 1, lastAttempt: now });
  } else {
    failedAttempts.set(memberId, { count: attempts.count + 1, lastAttempt: now });
  }
}

function clearFailedAttempts(memberId: string) {
  failedAttempts.delete(memberId);
}

// Validate member ID format: alphanumeric only, max 10 characters
function isValidMemberId(id: string): boolean {
  return /^[a-zA-Z0-9]{1,10}$/.test(id);
}

// Validate PIN format: exactly 4 digits
function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("gym-session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifySession(token);
    if (!payload || payload.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit
    const rateLimit = checkRateLimit(payload.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Previše neuspelih pokušaja. Pokušaj ponovo za ${rateLimit.remainingTime} sekundi.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { currentPin, newMemberId, newPin } = body;

    // Current PIN is always required
    if (!currentPin) {
      return NextResponse.json(
        { error: "Trenutni PIN je obavezan" },
        { status: 400 }
      );
    }

    // At least one change must be requested
    if (!newMemberId && !newPin) {
      return NextResponse.json(
        { error: "Morate uneti novi ID ili novi PIN" },
        { status: 400 }
      );
    }

    // Validate new member ID format if provided
    if (newMemberId && !isValidMemberId(newMemberId)) {
      return NextResponse.json(
        { error: "ID mora imati maksimalno 10 karaktera i samo slova/brojeve" },
        { status: 400 }
      );
    }

    // Validate new PIN format if provided
    if (newPin && !isValidPin(newPin)) {
      return NextResponse.json(
        { error: "PIN mora imati tačno 4 cifre" },
        { status: 400 }
      );
    }

    // Get current member
    const member = await prisma.member.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        memberId: true,
        pin: true,
        gymId: true,
        name: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Član nije pronađen" }, { status: 404 });
    }

    // Verify current PIN
    const isValidCurrentPin = await bcrypt.compare(currentPin, member.pin);
    if (!isValidCurrentPin) {
      recordFailedAttempt(payload.userId);
      return NextResponse.json(
        { error: "Pogrešan trenutni PIN" },
        { status: 401 }
      );
    }

    // Clear failed attempts on successful PIN verification
    clearFailedAttempts(payload.userId);

    // Check if new member ID is unique within the gym (if changing)
    if (newMemberId && newMemberId.toUpperCase() !== member.memberId) {
      const existingMember = await prisma.member.findFirst({
        where: {
          memberId: newMemberId.toUpperCase(),
          gymId: member.gymId,
          id: { not: member.id }, // Exclude current member
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: "Ovaj ID već postoji. Izaberi drugi." },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: {
      memberId?: string;
      pin?: string;
      qrCode?: string;
    } = {};

    // Update member ID if provided
    if (newMemberId) {
      updateData.memberId = newMemberId.toUpperCase();

      // Regenerate QR code with new member ID
      const qrData = JSON.stringify({
        memberId: newMemberId.toUpperCase(),
        gymId: member.gymId,
      });
      updateData.qrCode = await QRCode.toDataURL(qrData);
    }

    // Hash and update PIN if provided
    if (newPin) {
      updateData.pin = await bcrypt.hash(newPin, 10);
    }

    // Update member
    const updatedMember = await prisma.member.update({
      where: { id: member.id },
      data: updateData,
      select: {
        memberId: true,
        qrCode: true,
      },
    });

    // Log the credential change (for audit purposes)
    console.log(`[CREDENTIAL_CHANGE] Member ${member.name} (${member.id}) changed credentials. ID changed: ${!!newMemberId}, PIN changed: ${!!newPin}`);

    return NextResponse.json({
      success: true,
      message: "Pristupni podaci uspešno promenjeni",
      memberId: updatedMember.memberId,
      qrCode: newMemberId ? updatedMember.qrCode : undefined,
    });
  } catch (error) {
    console.error("Error updating credentials:", error);
    return NextResponse.json(
      { error: "Greška pri promeni pristupnih podataka" },
      { status: 500 }
    );
  }
}
