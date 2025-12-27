import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await prisma.member.findUnique({
      where: { id: session.userId },
      select: {
        weight: true,
        goal: true,
        createdAt: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get all weekly check-ins, ordered by date
    const checkins = await prisma.weeklyCheckin.findMany({
      where: { memberId: session.userId },
      orderBy: [{ year: "asc" }, { weekNumber: "asc" }],
      select: {
        weight: true,
        feeling: true,
        weekNumber: true,
        year: true,
        createdAt: true,
      },
    });

    // Calculate stats
    const startWeight = member.weight || (checkins.length > 0 ? checkins[0].weight : null);
    const currentWeight = checkins.length > 0 ? checkins[checkins.length - 1].weight : startWeight;

    let totalChange = 0;
    let weeklyAvgChange = 0;
    let avgFeeling = 0;

    if (checkins.length > 0 && startWeight) {
      totalChange = currentWeight! - startWeight;

      if (checkins.length > 1) {
        weeklyAvgChange = totalChange / (checkins.length - 1);
      }

      avgFeeling = checkins.reduce((sum, c) => sum + c.feeling, 0) / checkins.length;
    }

    // Determine if progress is positive based on goal
    let isProgressPositive = false;
    if (member.goal === "fat_loss") {
      isProgressPositive = totalChange < 0; // Losing weight is good
    } else if (member.goal === "muscle_gain") {
      isProgressPositive = totalChange > 0; // Gaining weight is good
    } else {
      // Recomposition - staying stable is good
      isProgressPositive = Math.abs(totalChange) < 2;
    }

    // Get week number for next check-in
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const hasCheckedInThisWeek = checkins.some(
      (c) => c.weekNumber === currentWeek.week && c.year === currentWeek.year
    );

    return NextResponse.json({
      checkins,
      stats: {
        startWeight,
        currentWeight,
        totalChange: Math.round(totalChange * 10) / 10,
        weeklyAvgChange: Math.round(weeklyAvgChange * 100) / 100,
        avgFeeling: Math.round(avgFeeling * 10) / 10,
        totalCheckins: checkins.length,
        isProgressPositive,
        memberSince: member.createdAt,
      },
      goal: member.goal,
      hasCheckedInThisWeek,
    });
  } catch (error) {
    console.error("Progress fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}

function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week: weekNumber, year: d.getUTCFullYear() };
}
