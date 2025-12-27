import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyPin, createSession, setSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, pin, gymId } = body;

    if (!memberId || !pin || !gymId) {
      return NextResponse.json(
        { error: "Member ID, PIN, and Gym are required" },
        { status: 400 }
      );
    }

    const member = await prisma.member.findUnique({
      where: {
        memberId_gymId: {
          memberId: memberId.toUpperCase(),
          gymId,
        }
      },
      include: { gym: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Invalid Member ID or PIN" },
        { status: 401 }
      );
    }

    if (member.status !== "active") {
      return NextResponse.json(
        { error: "Your account is not active. Please contact staff." },
        { status: 403 }
      );
    }

    const isValidPin = await verifyPin(pin, member.pin);
    if (!isValidPin) {
      return NextResponse.json(
        { error: "Invalid Member ID or PIN" },
        { status: 401 }
      );
    }

    const token = await createSession({
      userId: member.id,
      userType: "member",
      gymId: member.gymId,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: member.id,
        name: member.name,
        goal: member.goal,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
