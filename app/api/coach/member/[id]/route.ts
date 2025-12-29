import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { calculateDailyTargets, Goal } from "@/lib/calculations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: memberId } = await params;

    // Get staff info
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const isCoach = staff.role.toLowerCase() === "coach";

    // For coaches, verify assignment
    if (isCoach) {
      const assignment = await prisma.coachAssignment.findUnique({
        where: { memberId },
      });

      if (!assignment || assignment.staffId !== session.userId) {
        return NextResponse.json(
          { error: "Not assigned to this member" },
          { status: 403 }
        );
      }
    }

    // Get member with all related data
    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        gymId: session.gymId,
      },
      select: {
        id: true,
        memberId: true,
        name: true,
        goal: true,
        weight: true,
        height: true,
        gender: true,
        status: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Date calculations
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get logs from last 7 days
    const last7DaysLogs = await prisma.dailyLog.findMany({
      where: {
        memberId,
        date: { gte: sevenDaysAgo },
      },
      orderBy: { date: "desc" },
    });

    // Get recent check-ins
    const recentCheckins = await prisma.weeklyCheckin.findMany({
      where: { memberId },
      orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
      take: 8,
    });

    // Get coach notes for this member
    const notes = await prisma.staffNote.findMany({
      where: {
        memberId,
        staffId: session.userId,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Get recent nudges sent to this member
    const nudges = await prisma.coachNudge.findMany({
      where: {
        memberId,
        staffId: session.userId,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Calculate targets
    const targets = calculateDailyTargets(member.weight || 70, member.goal as Goal);

    // Process weekly stats
    const logsByDate = new Map<string, typeof last7DaysLogs>();
    for (const log of last7DaysLogs) {
      const dateKey = new Date(log.date).toISOString().split("T")[0];
      if (!logsByDate.has(dateKey)) {
        logsByDate.set(dateKey, []);
      }
      logsByDate.get(dateKey)!.push(log);
    }

    let weeklyTrainingSessions = 0;
    let daysWithMeals = 0;
    let totalCalories = 0;
    let totalProtein = 0;
    let daysWithCalories = 0;
    let waterGlasses = 0;

    for (const [, dayLogs] of logsByDate) {
      weeklyTrainingSessions += dayLogs.filter(l => l.type === "training").length;
      waterGlasses += dayLogs.filter(l => l.type === "water").length;
      if (dayLogs.some(l => l.type === "meal")) daysWithMeals++;

      const dayCalories = dayLogs.reduce((sum, l) => sum + (l.estimatedCalories || 0), 0);
      const dayProtein = dayLogs.reduce((sum, l) => sum + (l.estimatedProtein || 0), 0);

      if (dayCalories > 0) {
        totalCalories += dayCalories;
        totalProtein += dayProtein;
        daysWithCalories++;
      }
    }

    const avgDailyCalories = daysWithCalories > 0 ? Math.round(totalCalories / daysWithCalories) : 0;
    const avgDailyProtein = daysWithCalories > 0 ? Math.round(totalProtein / daysWithCalories) : 0;

    // Weight trend
    let weightTrend: "up" | "down" | "stable" = "stable";
    let weightChange = 0;
    let startWeight = member.weight;
    let currentWeight = member.weight;

    if (recentCheckins.length >= 2) {
      const oldest = recentCheckins[recentCheckins.length - 1];
      const newest = recentCheckins[0];
      startWeight = oldest.weight;
      currentWeight = newest.weight;
      weightChange = Math.round((currentWeight - startWeight) * 10) / 10;

      if (weightChange < -0.5) weightTrend = "down";
      else if (weightChange > 0.5) weightTrend = "up";
    }

    // Last activity
    const lastLog = last7DaysLogs[0];
    const lastTraining = last7DaysLogs.find(l => l.type === "training");
    const lastMeal = last7DaysLogs.find(l => l.type === "meal");

    // Generate AI-like behavior summary (without actual AI call for now)
    const summary = generateBehaviorSummary({
      name: member.name.split(" ")[0],
      goal: member.goal,
      weeklyTrainingSessions,
      daysWithMeals,
      avgDailyCalories,
      avgDailyProtein,
      targets,
      weightTrend,
      weightChange,
      waterGlasses,
      daysSinceLastActivity: lastLog
        ? Math.floor((now.getTime() - new Date(lastLog.date).getTime()) / (1000 * 60 * 60 * 24))
        : 999,
    });

    return NextResponse.json({
      member: {
        ...member,
        memberSince: member.createdAt,
      },
      snapshot: {
        currentWeight,
        startWeight,
        weightChange,
        weightTrend,
        weeklyTrainingSessions,
        daysWithMeals,
        avgDailyCalories,
        avgDailyProtein,
        waterGlasses,
        targets,
        lastActivity: lastLog?.date || null,
        lastTraining: lastTraining?.date || null,
        lastMeal: lastMeal?.date || null,
      },
      summary,
      recentCheckins: recentCheckins.map(c => ({
        weight: c.weight,
        feeling: c.feeling,
        weekNumber: c.weekNumber,
        year: c.year,
        createdAt: c.createdAt,
      })),
      notes: notes.map(n => ({
        id: n.id,
        content: n.content,
        createdAt: n.createdAt,
      })),
      nudges: nudges.map(n => ({
        id: n.id,
        message: n.message,
        createdAt: n.createdAt,
        seen: !!n.seenAt,
      })),
    });
  } catch (error) {
    console.error("Get member detail error:", error);
    return NextResponse.json(
      { error: "Failed to get member details" },
      { status: 500 }
    );
  }
}

// Generate a behavior summary (rule-based, could be AI-enhanced later)
function generateBehaviorSummary(data: {
  name: string;
  goal: string;
  weeklyTrainingSessions: number;
  daysWithMeals: number;
  avgDailyCalories: number;
  avgDailyProtein: number;
  targets: { calories: number; protein: number };
  weightTrend: "up" | "down" | "stable";
  weightChange: number;
  waterGlasses: number;
  daysSinceLastActivity: number;
}): string {
  const parts: string[] = [];

  // Training assessment
  if (data.weeklyTrainingSessions >= 4) {
    parts.push(`${data.name} je trenirao ${data.weeklyTrainingSessions}x ove nedelje — odlično!`);
  } else if (data.weeklyTrainingSessions >= 2) {
    parts.push(`${data.name} je trenirao ${data.weeklyTrainingSessions}x ove nedelje.`);
  } else if (data.weeklyTrainingSessions === 1) {
    parts.push(`${data.name} je trenirao samo jednom ove nedelje.`);
  } else {
    parts.push(`${data.name} nije trenirao ove nedelje.`);
  }

  // Meal logging assessment
  if (data.daysWithMeals >= 5) {
    parts.push(`Loguje obroke redovno (${data.daysWithMeals}/7 dana).`);
  } else if (data.daysWithMeals >= 3) {
    parts.push(`Loguje obroke ${data.daysWithMeals}/7 dana.`);
  } else if (data.daysWithMeals > 0) {
    parts.push(`Slabo loguje obroke (samo ${data.daysWithMeals} dana).`);
  }

  // Calorie assessment
  if (data.avgDailyCalories > 0) {
    const caloriePercent = Math.round((data.avgDailyCalories / data.targets.calories) * 100);
    if (data.goal === "fat_loss") {
      if (caloriePercent <= 100) {
        parts.push(`Kalorije u okviru cilja (${caloriePercent}%).`);
      } else {
        parts.push(`Kalorije iznad cilja (${caloriePercent}%) — pazi na unos.`);
      }
    } else if (data.goal === "muscle_gain") {
      if (caloriePercent >= 90) {
        parts.push(`Kalorije na nivou za rast (${caloriePercent}%).`);
      } else {
        parts.push(`Kalorije ispod cilja (${caloriePercent}%) — treba više hrane.`);
      }
    }
  }

  // Protein assessment
  if (data.avgDailyProtein > 0) {
    const proteinPercent = Math.round((data.avgDailyProtein / data.targets.protein) * 100);
    if (proteinPercent < 70) {
      parts.push(`Protein nizak (${proteinPercent}% cilja).`);
    } else if (proteinPercent >= 90) {
      parts.push(`Protein odličan.`);
    }
  }

  // Weight trend assessment based on goal
  if (data.weightChange !== 0) {
    if (data.goal === "fat_loss") {
      if (data.weightTrend === "down") {
        parts.push(`Težina pada (${data.weightChange}kg) — dobar napredak!`);
      } else if (data.weightTrend === "up") {
        parts.push(`Težina raste (+${data.weightChange}kg) — potrebna pažnja.`);
      }
    } else if (data.goal === "muscle_gain") {
      if (data.weightTrend === "up") {
        parts.push(`Težina raste (+${data.weightChange}kg) — na dobrom putu!`);
      } else if (data.weightTrend === "down") {
        parts.push(`Težina pada (${data.weightChange}kg) — potrebno više kalorija.`);
      }
    }
  }

  // Activity warning
  if (data.daysSinceLastActivity >= 5) {
    parts.push(`⚠️ Nema aktivnosti ${data.daysSinceLastActivity} dana.`);
  }

  // Overall assessment
  const isConsistent = data.weeklyTrainingSessions >= 2 && data.daysWithMeals >= 4;
  if (isConsistent) {
    parts.push("Generalno: dobra doslednost.");
  } else {
    parts.push("Generalno: potrebno poboljšanje doslednosti.");
  }

  return parts.join(" ");
}
