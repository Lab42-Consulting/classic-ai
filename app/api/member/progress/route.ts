import { NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  calculateDailyTargets,
  calculateConsistencyScore,
  getConsistencyLevel,
  Goal,
} from "@/lib/calculations";

export async function GET() {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const member = await prisma.member.findUnique({
      where: { id: authResult.memberId },
      include: {
        coachAssignment: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get last 7 days of logs for consistency calculation
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last7DaysLogs = await prisma.dailyLog.findMany({
      where: {
        memberId: authResult.memberId,
        date: { gte: sevenDaysAgo },
      },
      select: {
        date: true,
        type: true,
        estimatedCalories: true,
        estimatedProtein: true,
      },
    });

    // Get member's difficulty mode
    const difficultyMode = member.difficultyMode || "standard";
    const isSimpleMode = difficultyMode === "simple";

    // Priority: Coach targets > Member custom targets > Auto-calculated
    const autoTargets = calculateDailyTargets(
      member.weight || 70,
      member.goal as Goal
    );
    const coachTargets = member.coachAssignment;
    const targets = {
      calories: coachTargets?.customCalories || member.customCalories || autoTargets.calories,
      protein: coachTargets?.customProtein || member.customProtein || autoTargets.protein,
    };

    // Calculate weekly stats for consistency
    const logsByDate = new Map<string, typeof last7DaysLogs>();
    for (const log of last7DaysLogs) {
      const dateKey = new Date(log.date).toISOString().split("T")[0];
      if (!logsByDate.has(dateKey)) {
        logsByDate.set(dateKey, []);
      }
      logsByDate.get(dateKey)!.push(log);
    }

    let trainingSessions = 0;
    let daysWithMeals = 0;
    let totalCalorieAdherence = 0;
    let totalProteinAdherence = 0;
    let daysWithCalories = 0;
    let waterConsistentDays = 0;

    for (const [, dayLogs] of logsByDate) {
      trainingSessions += dayLogs.filter((l) => l.type === "training").length;
      if (dayLogs.some((l) => l.type === "meal")) daysWithMeals++;

      const dayCalories = dayLogs.reduce((sum, l) => sum + (l.estimatedCalories || 0), 0);
      if (dayCalories > 0) {
        totalCalorieAdherence += (dayCalories / targets.calories) * 100;
        daysWithCalories++;
      }

      const dayProtein = dayLogs.reduce((sum, l) => sum + (l.estimatedProtein || 0), 0);
      if (dayProtein > 0) {
        totalProteinAdherence += (dayProtein / targets.protein) * 100;
      }

      const waterCount = dayLogs.filter((l) => l.type === "water").length;
      if (waterCount >= 4) waterConsistentDays++;
    }

    const weeklyStats = {
      trainingSessions,
      daysWithMeals,
      avgCalorieAdherence: daysWithCalories > 0 ? totalCalorieAdherence / daysWithCalories : 0,
      avgProteinAdherence: daysWithCalories > 0 ? totalProteinAdherence / daysWithCalories : 0,
      waterConsistency: waterConsistentDays,
    };

    // Calculate consistency score based on difficulty mode
    // Simple mode: excludes calories/protein, redistributes weights proportionally
    // Standard/Pro: includes all metrics
    let consistencyScore: number;
    let breakdown: {
      training: number;
      logging: number;
      calories: number | null;
      protein: number | null;
      water: number;
    };

    if (isSimpleMode) {
      // Simple mode weights (redistributed to sum to 100):
      // Training: 50 (was 30), Logging: 33 (was 20), Water: 17 (was 10)
      const trainingScore = Math.min(50, weeklyStats.trainingSessions * 16.67);
      const loggingScore = Math.min(33, Math.floor(weeklyStats.daysWithMeals / 7 * 33));
      const waterScore = Math.min(17, Math.floor(weeklyStats.waterConsistency / 7 * 17));

      consistencyScore = Math.round(trainingScore + loggingScore + waterScore);
      breakdown = {
        training: Math.round(trainingScore),
        logging: Math.round(loggingScore),
        calories: null, // Not tracked in simple mode
        protein: null,  // Not tracked in simple mode
        water: Math.round(waterScore),
      };
    } else {
      // Standard/Pro mode: original calculation
      consistencyScore = calculateConsistencyScore(weeklyStats);
      breakdown = {
        training: Math.min(30, weeklyStats.trainingSessions * 10),
        logging: Math.min(20, Math.floor(weeklyStats.daysWithMeals / 7 * 20)),
        calories: Math.max(0, Math.round(25 - Math.abs(100 - weeklyStats.avgCalorieAdherence) * 0.5)),
        protein: Math.min(15, Math.round(weeklyStats.avgProteinAdherence * 0.15)),
        water: Math.min(10, Math.floor(weeklyStats.waterConsistency / 7 * 10)),
      };
    }

    const consistencyLevel = getConsistencyLevel(consistencyScore);

    // Get all weekly check-ins, ordered by date
    const checkins = await prisma.weeklyCheckin.findMany({
      where: { memberId: authResult.memberId },
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
      // Weekly consistency data
      consistency: {
        score: consistencyScore,
        level: consistencyLevel,
        breakdown,
        weeklyStats: {
          trainingSessions: weeklyStats.trainingSessions,
          daysWithMeals: weeklyStats.daysWithMeals,
          waterConsistentDays: weeklyStats.waterConsistency,
        },
      },
      goal: member.goal,
      difficultyMode,
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
