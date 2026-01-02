import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";
import { getWeekNumber } from "@/lib/calculations";

const MINIMUM_DAYS_BETWEEN_CHECKINS = 7;

export async function POST(request: NextRequest) {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    // Weekly check-in is only available on Sunday (end of week)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday
    if (dayOfWeek !== 0) {
      const daysUntilSunday = 7 - dayOfWeek;
      return NextResponse.json(
        {
          error: `Nedeljni pregled je dostupan samo nedeljom. Sačekaj još ${daysUntilSunday} ${daysUntilSunday === 1 ? "dan" : "dana"}.`,
          daysUntilSunday,
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { weight, feeling } = body;

    if (!weight || typeof weight !== "number" || weight < 30 || weight > 300) {
      return NextResponse.json(
        { error: "Valid weight is required (30-300 kg)" },
        { status: 400 }
      );
    }

    if (!feeling || typeof feeling !== "number" || feeling < 1 || feeling > 4) {
      return NextResponse.json(
        { error: "Feeling is required (1-4)" },
        { status: 400 }
      );
    }

    const { week, year } = getWeekNumber(new Date());

    // Check if already checked in this week
    const existingCheckin = await prisma.weeklyCheckin.findUnique({
      where: {
        memberId_weekNumber_year: {
          memberId: authResult.memberId,
          weekNumber: week,
          year,
        },
      },
    });

    if (existingCheckin) {
      return NextResponse.json(
        { error: "Već si završio pregled ove nedelje" },
        { status: 400 }
      );
    }

    // Check if 7 days have passed since last check-in
    const lastCheckin = await prisma.weeklyCheckin.findFirst({
      where: { memberId: authResult.memberId },
      orderBy: { createdAt: "desc" },
    });

    if (lastCheckin) {
      const daysSinceLastCheckin = Math.floor(
        (Date.now() - lastCheckin.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastCheckin < MINIMUM_DAYS_BETWEEN_CHECKINS) {
        const daysRemaining = MINIMUM_DAYS_BETWEEN_CHECKINS - daysSinceLastCheckin;
        return NextResponse.json(
          {
            error: `Moraš sačekati još ${daysRemaining} ${daysRemaining === 1 ? "dan" : "dana"} pre sledećeg pregleda`,
            daysRemaining,
          },
          { status: 400 }
        );
      }
    }

    const checkin = await prisma.weeklyCheckin.create({
      data: {
        memberId: authResult.memberId,
        weight,
        feeling,
        weekNumber: week,
        year,
      },
    });

    // Update member's current weight
    await prisma.member.update({
      where: { id: authResult.memberId },
      data: { weight },
    });

    return NextResponse.json({ success: true, checkin });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { error: "Failed to save check-in" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const { week, year } = getWeekNumber(new Date());

    // Get current week check-in
    const currentWeekCheckin = await prisma.weeklyCheckin.findUnique({
      where: {
        memberId_weekNumber_year: {
          memberId: authResult.memberId,
          weekNumber: week,
          year,
        },
      },
    });

    // Get last check-in (for 7-day calculation)
    const lastCheckin = await prisma.weeklyCheckin.findFirst({
      where: { memberId: authResult.memberId },
      orderBy: { createdAt: "desc" },
    });

    // Get recent check-ins for history
    const recentCheckins = await prisma.weeklyCheckin.findMany({
      where: { memberId: authResult.memberId },
      orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
      take: 12,
    });

    // Calculate days until next check-in is allowed
    let daysUntilNextCheckin = 0;
    let canCheckIn = true;
    let reason = "";

    // Check-ins only allowed on Sunday
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday
    const isSunday = dayOfWeek === 0;
    const daysUntilSunday = isSunday ? 0 : 7 - dayOfWeek;

    if (!isSunday) {
      canCheckIn = false;
      daysUntilNextCheckin = daysUntilSunday;
      reason = "sunday_only";
    } else if (currentWeekCheckin) {
      canCheckIn = false;
      daysUntilNextCheckin = 7; // Next Sunday
      reason = "already_done";
    } else if (lastCheckin) {
      const daysSinceLastCheckin = Math.floor(
        (Date.now() - lastCheckin.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastCheckin < MINIMUM_DAYS_BETWEEN_CHECKINS) {
        daysUntilNextCheckin = MINIMUM_DAYS_BETWEEN_CHECKINS - daysSinceLastCheckin;
        canCheckIn = false;
        reason = "too_soon";
      }
    }

    // Calculate missed weeks (accountability)
    const missedWeeks = calculateMissedWeeks(recentCheckins);

    return NextResponse.json({
      hasCheckedInThisWeek: !!currentWeekCheckin,
      canCheckIn,
      daysUntilNextCheckin,
      reason,
      isSunday,
      currentWeek: week,
      currentYear: year,
      lastCheckinDate: lastCheckin?.createdAt || null,
      missedWeeks,
      recentCheckins,
    });
  } catch (error) {
    console.error("Get check-ins error:", error);
    return NextResponse.json(
      { error: "Failed to get check-ins" },
      { status: 500 }
    );
  }
}

interface CheckinRecord {
  weekNumber: number;
  year: number;
}

function calculateMissedWeeks(checkins: CheckinRecord[]): number {
  if (checkins.length < 2) return 0;

  // Sort checkins chronologically
  const sortedCheckins = [...checkins].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.weekNumber - b.weekNumber;
  });

  const firstCheckin = sortedCheckins[0];
  const currentWeek = getWeekNumber(new Date());

  // Calculate total weeks from first check-in to now
  let totalWeeks = 0;
  let tempYear = firstCheckin.year;
  let tempWeek = firstCheckin.weekNumber;

  while (
    tempYear < currentWeek.year ||
    (tempYear === currentWeek.year && tempWeek < currentWeek.week)
  ) {
    totalWeeks++;
    tempWeek++;
    // Handle year rollover (using ISO week calculation - 52 or 53 weeks)
    if (tempWeek > 52) {
      tempWeek = 1;
      tempYear++;
    }
  }

  // Missed weeks = total weeks - actual check-ins
  const actualCheckins = checkins.length;
  const missedWeeks = Math.max(0, totalWeeks - actualCheckins);

  return missedWeeks;
}
