import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";
import { isValidDailyCode } from "@/lib/checkin";

/**
 * POST /api/member/gym-checkin
 * Records a gym check-in for challenge verification
 * Member scans QR code at gym which contains the checkinSecret
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { secret } = body;

    if (!secret) {
      return NextResponse.json(
        { error: "Nedostaje kod za prijavu" },
        { status: 400 }
      );
    }

    // Get member's gym and verify the secret
    const member = await prisma.member.findUnique({
      where: { id: authResult.memberId },
      select: {
        gymId: true,
        gym: {
          select: {
            id: true,
            checkinSecret: true,
            name: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Član nije pronađen" },
        { status: 404 }
      );
    }

    // Verify the gym has check-in enabled
    if (!member.gym.checkinSecret) {
      return NextResponse.json(
        { error: "Teretana nema aktiviran sistem prijave" },
        { status: 400 }
      );
    }

    // Validate against today's daily code (with grace period for midnight edge case)
    if (!isValidDailyCode(member.gym.checkinSecret, secret)) {
      return NextResponse.json(
        { error: "Nevažeći ili istekao kod za prijavu" },
        { status: 400 }
      );
    }

    // Get today's date (start of day in UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingCheckin = await prisma.gymCheckin.findUnique({
      where: {
        memberId_date: {
          memberId: authResult.memberId,
          date: today,
        },
      },
    });

    if (existingCheckin) {
      return NextResponse.json({
        success: true,
        message: "Već si prijavljen danas",
        alreadyCheckedIn: true,
        checkinId: existingCheckin.id,
        date: existingCheckin.date,
      });
    }

    // Create the check-in
    const checkin = await prisma.gymCheckin.create({
      data: {
        memberId: authResult.memberId,
        gymId: member.gymId,
        date: today,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Uspešno prijavljen! Tvoj trening danas će biti uračunat u izazov.",
      alreadyCheckedIn: false,
      checkinId: checkin.id,
      date: checkin.date,
    });
  } catch (error) {
    console.error("Error creating gym check-in:", error);
    return NextResponse.json(
      { error: "Greška pri prijavi u teretanu" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/member/gym-checkin
 * Get today's check-in status for the member
 */
export async function GET() {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    // Get today's date (start of day in UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Check if already checked in today
    const todayCheckin = await prisma.gymCheckin.findUnique({
      where: {
        memberId_date: {
          memberId: authResult.memberId,
          date: today,
        },
      },
    });

    // Also check if member is in any active challenge
    const member = await prisma.member.findUnique({
      where: { id: authResult.memberId },
      select: {
        gymId: true,
        challengeParticipations: {
          where: {
            challenge: {
              status: { in: ["registration", "active"] },
            },
          },
          select: {
            id: true,
            challenge: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const isInActiveChallenge = member?.challengeParticipations && member.challengeParticipations.length > 0;

    return NextResponse.json({
      checkedInToday: !!todayCheckin,
      checkinTime: todayCheckin?.createdAt || null,
      isInActiveChallenge,
      challengeName: isInActiveChallenge ? member.challengeParticipations[0].challenge.name : null,
    });
  } catch (error) {
    console.error("Error getting gym check-in status:", error);
    return NextResponse.json(
      { error: "Greška pri proveri statusa prijave" },
      { status: 500 }
    );
  }
}
