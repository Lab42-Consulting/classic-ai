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

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

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

    // Process each member
    const membersWithStats: MemberStats[] = await Promise.all(
      members.map(async (member) => {
        // Get logs from last 7 days
        const last7DaysLogs = await prisma.dailyLog.findMany({
          where: {
            memberId: member.id,
            date: { gte: sevenDaysAgo },
          },
          select: {
            date: true,
            type: true,
            estimatedCalories: true,
            estimatedProtein: true,
          },
          orderBy: { date: "desc" },
        });

        // Get last 30 days logs for streak calculation
        const last30DaysLogs = await prisma.dailyLog.findMany({
          where: {
            memberId: member.id,
            date: { gte: thirtyDaysAgo },
          },
          select: { date: true },
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

        // Calculate targets
        const targets = calculateDailyTargets(member.weight || 70, member.goal as Goal);

        // Group logs by date for analysis
        const logsByDate = new Map<string, typeof last7DaysLogs>();
        for (const log of last7DaysLogs) {
          const dateKey = new Date(log.date).toISOString().split("T")[0];
          if (!logsByDate.has(dateKey)) {
            logsByDate.set(dateKey, []);
          }
          logsByDate.get(dateKey)!.push(log);
        }

        // Calculate weekly stats
        let weeklyTrainingSessions = 0;
        let daysWithMeals = 0;
        let totalCalorieAdherence = 0;
        let totalProteinAdherence = 0;
        let daysWithCalories = 0;

        for (const [, dayLogs] of logsByDate) {
          weeklyTrainingSessions += dayLogs.filter(l => l.type === "training").length;
          if (dayLogs.some(l => l.type === "meal")) daysWithMeals++;

          const dayCalories = dayLogs.reduce((sum, l) => sum + (l.estimatedCalories || 0), 0);
          if (dayCalories > 0) {
            totalCalorieAdherence += Math.min((dayCalories / targets.calories) * 100, 150);
            daysWithCalories++;
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

        // Calculate consistency score
        const consistencyScore = calculateConsistencyScore({
          trainingSessions: weeklyTrainingSessions,
          daysWithMeals,
          avgCalorieAdherence: calorieAdherence,
          avgProteinAdherence: proteinAdherence,
          waterConsistency: 0, // simplified for dashboard
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

        // Determine activity status
        let activityStatus: ActivityStatus;
        if (daysSinceActivity <= 2 && weeklyTrainingSessions >= 2 && consistencyScore >= 60) {
          activityStatus = "on_track";
        } else if (daysSinceActivity <= 5 || consistencyScore >= 40) {
          activityStatus = "slipping";
        } else {
          activityStatus = "off_track";
        }

        // Generate alerts
        const alerts: string[] = [];

        if (daysSinceActivity >= 5) {
          alerts.push(`Nema aktivnosti ${daysSinceActivity} dana`);
        }
        if (!hasCurrentWeekCheckin && now.getDay() >= 4) { // Thursday or later
          alerts.push("Nedeljni pregled nije urađen");
        }
        if (proteinAdherence > 0 && proteinAdherence < 70) {
          alerts.push("Protein ispod cilja");
        }
        if (weeklyTrainingSessions < 2 && daysWithMeals >= 3) {
          alerts.push("Malo treninga ove nedelje");
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
