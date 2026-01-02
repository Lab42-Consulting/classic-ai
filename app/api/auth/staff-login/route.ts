import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyPin, createSession, setSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staffId, pin, gymId } = body;

    if (!staffId || !pin || !gymId) {
      return NextResponse.json(
        { error: "Staff ID, PIN, and Gym are required" },
        { status: 400 }
      );
    }

    const staff = await prisma.staff.findUnique({
      where: {
        staffId_gymId: {
          staffId: staffId.toUpperCase(),
          gymId,
        }
      },
      include: {
        gym: true,
        linkedMember: {
          select: {
            id: true,
            memberId: true,
            name: true,
          },
        },
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Invalid Staff ID or PIN" },
        { status: 401 }
      );
    }

    const isValidPin = await verifyPin(pin, staff.pin);
    if (!isValidPin) {
      return NextResponse.json(
        { error: "Invalid Staff ID or PIN" },
        { status: 401 }
      );
    }

    const token = await createSession({
      userId: staff.id,
      userType: "staff",
      gymId: staff.gymId,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        linkedMember: staff.linkedMember
          ? {
              id: staff.linkedMember.id,
              memberId: staff.linkedMember.memberId,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Staff login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
