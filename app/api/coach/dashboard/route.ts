import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { calculateDailyTargets, calculateConsistencyScore, Goal } from "@/lib/calculations";

type ActivityStatus = "on_track" | "slipping" | "off_track";

interface MemberStats {
  id: string;
  memberId: string;
  name: string;
  goal: string;
  currentWeight: number | null;
  activityStatus: ActivityStatus;
  consistencyScore: number;
  streak: number;
  lastActivityDate: string | null;
  daysSinceActivity: number;
  weeklyTrainingSessions: number;
  calorieAdherence: number; // percentage
  proteinAdherence: number; // percentage
  weightTrend: "up" | "down" | "stable";
  weightChange: number; // kg change over last 4 weeks
  missedCheckin: boolean;
  alerts: string[];
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get staff info to check role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, name: true },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const isCoach = staff.role.toLowerCase() === "coach";

    // Get members - coaches see only assigned, admins see all
    let memberIds: string[] = [];

    if (isCoach) {
      const assignments = await prisma.coachAssignment.findMany({
        where: { staffId: session.userId },
        select: { memberId: true },
      });
      memberIds = assignments.map(a => a.memberId);
    }

    const members = await prisma.member.findMany({
      where: {
        gymId: session.gymId,
        ...(isCoach && memberIds.length > 0 ? { id: { in: memberIds } } : {}),
      },
      select: {
        id: true,
        memberId: true,
        name: true,
        goal: true,
        weight: true,
        createdAt: true,
      },
    });

    // Date calculations
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Get Monday of current week (week starts on Monday)
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 6 days since Monday
    const mondayOfThisWeek = new Date(today);
    mondayOfThisWeek.setDate(today.getDate() - daysSinceMonday);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get current week number for check-in tracking
    const getWeekNumber = (date: Date): { week: number; year: number } => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return { week: weekNumber, year: d.getUTCFullYear() };
    };

    const currentWeek = getWeekNumber(now);

    // Calculate how many days have passed this week (1 = Monday, 7 = Sunday)
    const daysPassedThisWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

    // Process each member
    const membersWithStats: MemberStats[] = await Promise.all(
      members.map(async (member) => {
        // Get logs from this week (Monday to today)
        const thisWeekLogs = await prisma.dailyLog.findMany({
          where: {
            memberId: member.id,
            date: { gte: mondayOfThisWeek },
          },
          select: {
            date: true,
            type: true,
            estimatedCalories: true,
            estimatedProtein: true,
          },
          orderBy: { date: "desc" },
        });

        // Get last 30 days logs for streak calculation and activity tracking
        const last30DaysLogs = await prisma.dailyLog.findMany({
          where: {
            memberId: member.id,
            date: { gte: thirtyDaysAgo },
          },
          select: { date: true, type: true },
          orderBy: { date: "desc" },
        });

        // Get recent check-ins for weight trend
        const recentCheckins = await prisma.weeklyCheckin.findMany({
          where: { memberId: member.id },
          orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
          take: 4,
          select: { weight: true, weekNumber: true, year: true },
        });

        // Check if current week check-in is done
        const hasCurrentWeekCheckin = recentCheckins.some(
          c => c.weekNumber === currentWeek.week && c.year === currentWeek.year
        );

        // Check if LAST week's check-in was done (more important for activity status)
        const lastWeek = currentWeek.week === 1
          ? { week: 52, year: currentWeek.year - 1 }
          : { week: currentWeek.week - 1, year: currentWeek.year };
        const hasLastWeekCheckin = recentCheckins.some(
          c => c.weekNumber === lastWeek.week && c.year === lastWeek.year
        );

        // Calculate targets
        const targets = calculateDailyTargets(member.weight || 70, member.goal as Goal);

        // Group logs by date for analysis
        const logsByDate = new Map<string, typeof thisWeekLogs>();
        for (const log of thisWeekLogs) {
          const dateKey = new Date(log.date).toISOString().split("T")[0];
          if (!logsByDate.has(dateKey)) {
            logsByDate.set(dateKey, []);
          }
          logsByDate.get(dateKey)!.push(log);
        }

        // Calculate weekly stats
        let weeklyTrainingSessions = 0;
        let daysWithMeals = 0;
        let daysWithWater = 0;
        let totalCalorieAdherence = 0;
        let totalProteinAdherence = 0;
        let daysWithCalories = 0;
        let daysWithGoodCalories = 0; // Days within 70-130% of target

        for (const [, dayLogs] of logsByDate) {
          weeklyTrainingSessions += dayLogs.filter(l => l.type === "training").length;
          if (dayLogs.some(l => l.type === "meal")) daysWithMeals++;
          if (dayLogs.some(l => l.type === "water")) daysWithWater++;

          const dayCalories = dayLogs.reduce((sum, l) => sum + (l.estimatedCalories || 0), 0);
          if (dayCalories > 0) {
            const adherencePercent = (dayCalories / targets.calories) * 100;
            totalCalorieAdherence += Math.min(adherencePercent, 150);
            daysWithCalories++;
            // Check if within healthy range (70-130%)
            if (adherencePercent >= 70 && adherencePercent <= 130) {
              daysWithGoodCalories++;
            }
          }

          const dayProtein = dayLogs.reduce((sum, l) => sum + (l.estimatedProtein || 0), 0);
          if (dayProtein > 0) {
            totalProteinAdherence += Math.min((dayProtein / targets.protein) * 100, 150);
          }
        }

        const calorieAdherence = daysWithCalories > 0
          ? Math.round(totalCalorieAdherence / daysWithCalories)
          : 0;
        const proteinAdherence = daysWithCalories > 0
          ? Math.round(totalProteinAdherence / daysWithCalories)
          : 0;

        // Calculate water consistency (percentage of days with water logged)
        const waterConsistency = daysPassedThisWeek > 0
          ? Math.round((daysWithWater / daysPassedThisWeek) * 100)
          : 0;

        // Calculate consistency score
        const consistencyScore = calculateConsistencyScore({
          trainingSessions: weeklyTrainingSessions,
          daysWithMeals,
          avgCalorieAdherence: calorieAdherence,
          avgProteinAdherence: proteinAdherence,
          waterConsistency,
        });

        // Calculate streak (consecutive days with any activity)
        const uniqueDates = [...new Set(last30DaysLogs.map(l =>
          new Date(l.date).toISOString().split("T")[0]
        ))].sort().reverse();

        let streak = 0;
        const todayStr = today.toISOString().split("T")[0];
        let checkDate = new Date(today);

        for (let i = 0; i < uniqueDates.length && i < 30; i++) {
          const expectedDate = checkDate.toISOString().split("T")[0];
          if (uniqueDates.includes(expectedDate)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else if (expectedDate !== todayStr) {
            break;
          } else {
            checkDate.setDate(checkDate.getDate() - 1);
          }
        }

        // Last activity
        const lastActivityDate = last30DaysLogs[0]?.date || null;
        const daysSinceActivity = lastActivityDate
          ? Math.floor((now.getTime() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Weight trend (compare first and last of 4 recent checkins)
        let weightTrend: "up" | "down" | "stable" = "stable";
        let weightChange = 0;

        if (recentCheckins.length >= 2) {
          const oldest = recentCheckins[recentCheckins.length - 1].weight;
          const newest = recentCheckins[0].weight;
          weightChange = Math.round((newest - oldest) * 10) / 10;

          if (weightChange < -0.5) weightTrend = "down";
          else if (weightChange > 0.5) weightTrend = "up";
        }

        // Determine activity status based on:
        // - Recent activity (logging anything)
        // - Calorie adherence (within healthy range 70-130%)
        // - Water logging consistency
        // - Missed last week's check-in
        // Note: Training frequency is NOT used - it varies per person
        let activityStatus: ActivityStatus;

        // Calculate quality metrics
        const hasRecentActivity = daysSinceActivity <= 2;
        const isLoggingConsistently = daysWithMeals >= Math.max(1, daysPassedThisWeek - 1);
        const hasGoodCalorieAdherence = daysWithCalories > 0 &&
          (daysWithGoodCalories / daysWithCalories) >= 0.5; // 50%+ days in healthy range
        const hasGoodWaterLogging = waterConsistency >= 50;

        if (hasRecentActivity && isLoggingConsistently && hasGoodCalorieAdherence) {
          activityStatus = "on_track";
        } else if (daysSinceActivity >= 7 || (daysPassedThisWeek >= 3 && daysWithMeals === 0)) {
          activityStatus = "off_track";
        } else {
          activityStatus = "slipping";
        }

        // Generate alerts
        const alerts: string[] = [];

        // No recent activity
        if (daysSinceActivity >= 5) {
          alerts.push(`Nema aktivnosti ${daysSinceActivity} dana`);
        }

        // Missed last week's check-in (weigh-in)
        if (!hasLastWeekCheckin) {
          alerts.push("Propušten nedeljni pregled");
        }

        // Current week check-in reminder (Sunday only)
        if (!hasCurrentWeekCheckin && now.getDay() === 0) {
          alerts.push("Uradi nedeljni pregled");
        }

        // Calorie issues
        if (daysWithCalories >= 2 && calorieAdherence < 70) {
          alerts.push("Kalorije ispod cilja");
        } else if (daysWithCalories >= 2 && calorieAdherence > 130) {
          alerts.push("Kalorije iznad cilja");
        }

        // Protein issues
        if (proteinAdherence > 0 && proteinAdherence < 70) {
          alerts.push("Protein ispod cilja");
        }

        // Water logging
        if (daysPassedThisWeek >= 3 && waterConsistency < 30) {
          alerts.push("Slabo unos vode");
        }

        return {
          id: member.id,
          memberId: member.memberId,
          name: member.name,
          goal: member.goal,
          currentWeight: member.weight,
          activityStatus,
          consistencyScore,
          streak,
          lastActivityDate: lastActivityDate?.toISOString() || null,
          daysSinceActivity,
          weeklyTrainingSessions,
          calorieAdherence,
          proteinAdherence,
          weightTrend,
          weightChange,
          missedCheckin: !hasCurrentWeekCheckin,
          alerts,
        };
      })
    );

    // Sort by priority: off_track first, then slipping, then on_track
    const priorityOrder: Record<ActivityStatus, number> = {
      off_track: 0,
      slipping: 1,
      on_track: 2,
    };

    membersWithStats.sort((a, b) => {
      // First by status
      const statusDiff = priorityOrder[a.activityStatus] - priorityOrder[b.activityStatus];
      if (statusDiff !== 0) return statusDiff;

      // Then by days since activity (more days = higher priority)
      return b.daysSinceActivity - a.daysSinceActivity;
    });

    // Calculate summary stats
    const stats = {
      total: membersWithStats.length,
      onTrack: membersWithStats.filter(m => m.activityStatus === "on_track").length,
      slipping: membersWithStats.filter(m => m.activityStatus === "slipping").length,
      offTrack: membersWithStats.filter(m => m.activityStatus === "off_track").length,
      needsAttention: membersWithStats.filter(m => m.alerts.length > 0).length,
    };

    return NextResponse.json({
      coachName: staff.name,
      isCoach,
      stats,
      members: membersWithStats,
    });
  } catch (error) {
    console.error("Coach dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
