import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { calculateDailyTargets, calculateConsistencyScore, Goal } from "@/lib/calculations";

type ActivityStatus = "on_track" | "slipping" | "off_track";

interface AssignedMemberDetail {
  id: string;
  memberId: string;
  name: string;
  status: ActivityStatus;
  consistencyScore: number;
}

interface CoachPerformance {
  id: string;
  staffId: string;
  name: string;
  // Member stats
  assignedMemberCount: number;
  pendingRequestCount: number;
  // Assigned members with details
  assignedMembers: AssignedMemberDetail[];
  // Nudge engagement
  nudgeStats: {
    totalSent: number;
    totalViewed: number;
    viewRate: number; // percentage
  };
  // Member outcomes (aggregated)
  memberOutcomes: {
    onTrack: number;
    slipping: number;
    offTrack: number;
    avgConsistencyScore: number;
  };
}

// GET /api/admin/coach-performance - Admin-only endpoint for coach performance insights
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get all coaches in this gym
    const coaches = await prisma.staff.findMany({
      where: {
        gymId: session.gymId,
        role: "coach",
      },
      select: {
        id: true,
        staffId: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    // Get all coach assignments in one query
    const allAssignments = await prisma.coachAssignment.findMany({
      where: {
        staff: { gymId: session.gymId },
      },
      select: {
        staffId: true,
        memberId: true,
      },
    });

    // Get all pending requests in one query
    const allPendingRequests = await prisma.coachRequest.findMany({
      where: {
        staff: { gymId: session.gymId },
      },
      select: {
        staffId: true,
      },
    });

    // Get all nudges in one query (last 30 days for relevance)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allNudges = await prisma.coachNudge.findMany({
      where: {
        staff: { gymId: session.gymId },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        staffId: true,
        seenAt: true,
      },
    });

    // Get member IDs that are assigned to coaches
    const assignedMemberIds = allAssignments.map(a => a.memberId);

    // Get all assigned members with their data for consistency calculation
    const assignedMembers = assignedMemberIds.length > 0
      ? await prisma.member.findMany({
          where: {
            id: { in: assignedMemberIds },
            gymId: session.gymId,
          },
          select: {
            id: true,
            memberId: true,
            name: true,
            weight: true,
            goal: true,
          },
        })
      : [];

    // Build member lookup
    const memberMap = new Map(assignedMembers.map(m => [m.id, m]));

    // Calculate member activity status and consistency for each assigned member
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Get Monday of current week
    const dayOfWeek = now.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const mondayOfThisWeek = new Date(today);
    mondayOfThisWeek.setDate(today.getDate() - daysSinceMonday);
    const daysPassedThisWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

    // Get logs for all assigned members (this week)
    const allMemberLogs = assignedMemberIds.length > 0
      ? await prisma.dailyLog.findMany({
          where: {
            memberId: { in: assignedMemberIds },
            date: { gte: mondayOfThisWeek },
          },
          select: {
            memberId: true,
            date: true,
            type: true,
            estimatedCalories: true,
            estimatedProtein: true,
          },
        })
      : [];

    // Group logs by member
    const logsByMember = new Map<string, typeof allMemberLogs>();
    for (const log of allMemberLogs) {
      if (!logsByMember.has(log.memberId)) {
        logsByMember.set(log.memberId, []);
      }
      logsByMember.get(log.memberId)!.push(log);
    }

    // Calculate activity status for each member
    const memberStatusMap = new Map<string, { status: ActivityStatus; consistencyScore: number }>();

    for (const memberId of assignedMemberIds) {
      const member = memberMap.get(memberId);
      if (!member) continue;

      const logs = logsByMember.get(memberId) || [];
      const targets = calculateDailyTargets(member.weight || 70, member.goal as Goal);

      // Group logs by date
      const logsByDate = new Map<string, typeof logs>();
      for (const log of logs) {
        const dateKey = new Date(log.date).toISOString().split("T")[0];
        if (!logsByDate.has(dateKey)) {
          logsByDate.set(dateKey, []);
        }
        logsByDate.get(dateKey)!.push(log);
      }

      // Calculate weekly stats
      let daysWithMeals = 0;
      let daysWithWater = 0;
      let totalCalorieAdherence = 0;
      let totalProteinAdherence = 0;
      let daysWithCalories = 0;
      let daysWithGoodCalories = 0;
      let trainingSessions = 0;

      for (const [, dayLogs] of logsByDate) {
        trainingSessions += dayLogs.filter(l => l.type === "training").length;
        if (dayLogs.some(l => l.type === "meal")) daysWithMeals++;
        if (dayLogs.some(l => l.type === "water")) daysWithWater++;

        const dayCalories = dayLogs.reduce((sum, l) => sum + (l.estimatedCalories || 0), 0);
        if (dayCalories > 0) {
          const adherencePercent = (dayCalories / targets.calories) * 100;
          totalCalorieAdherence += Math.min(adherencePercent, 150);
          daysWithCalories++;
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
      const waterConsistency = daysPassedThisWeek > 0
        ? Math.round((daysWithWater / daysPassedThisWeek) * 100)
        : 0;

      const consistencyScore = calculateConsistencyScore({
        trainingSessions,
        daysWithMeals,
        avgCalorieAdherence: calorieAdherence,
        avgProteinAdherence: proteinAdherence,
        waterConsistency,
      });

      // Determine activity status
      const lastLog = logs.length > 0
        ? logs.reduce((latest, l) => new Date(l.date) > new Date(latest.date) ? l : latest)
        : null;
      const daysSinceActivity = lastLog
        ? Math.floor((now.getTime() - new Date(lastLog.date).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const hasRecentActivity = daysSinceActivity <= 2;
      const isLoggingConsistently = daysWithMeals >= Math.max(1, daysPassedThisWeek - 1);
      const hasGoodCalorieAdherence = daysWithCalories > 0 &&
        (daysWithGoodCalories / daysWithCalories) >= 0.5;

      let status: ActivityStatus;
      if (hasRecentActivity && isLoggingConsistently && hasGoodCalorieAdherence) {
        status = "on_track";
      } else if (daysSinceActivity >= 7 || (daysPassedThisWeek >= 3 && daysWithMeals === 0)) {
        status = "off_track";
      } else {
        status = "slipping";
      }

      memberStatusMap.set(memberId, { status, consistencyScore });
    }

    // Build coach performance data
    const coachPerformance: CoachPerformance[] = coaches.map(coach => {
      // Get assignments for this coach
      const coachAssignments = allAssignments.filter(a => a.staffId === coach.id);
      const coachMemberIds = coachAssignments.map(a => a.memberId);

      // Get pending requests for this coach
      const coachRequests = allPendingRequests.filter(r => r.staffId === coach.id);

      // Get nudges for this coach
      const coachNudges = allNudges.filter(n => n.staffId === coach.id);
      const viewedNudges = coachNudges.filter(n => n.seenAt !== null);

      // Calculate member outcomes and build member details list
      let onTrack = 0;
      let slipping = 0;
      let offTrack = 0;
      let totalConsistency = 0;
      const memberDetails: AssignedMemberDetail[] = [];

      for (const memberId of coachMemberIds) {
        const member = memberMap.get(memberId);
        const memberStatus = memberStatusMap.get(memberId);
        if (memberStatus && member) {
          if (memberStatus.status === "on_track") onTrack++;
          else if (memberStatus.status === "slipping") slipping++;
          else offTrack++;
          totalConsistency += memberStatus.consistencyScore;

          memberDetails.push({
            id: member.id,
            memberId: member.memberId,
            name: member.name,
            status: memberStatus.status,
            consistencyScore: memberStatus.consistencyScore,
          });
        }
      }

      // Sort members by status (off_track first, then slipping, then on_track)
      const statusOrder = { off_track: 0, slipping: 1, on_track: 2 };
      memberDetails.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

      const avgConsistencyScore = coachMemberIds.length > 0
        ? Math.round(totalConsistency / coachMemberIds.length)
        : 0;

      return {
        id: coach.id,
        staffId: coach.staffId,
        name: coach.name,
        assignedMemberCount: coachAssignments.length,
        pendingRequestCount: coachRequests.length,
        assignedMembers: memberDetails,
        nudgeStats: {
          totalSent: coachNudges.length,
          totalViewed: viewedNudges.length,
          viewRate: coachNudges.length > 0
            ? Math.round((viewedNudges.length / coachNudges.length) * 100)
            : 0,
        },
        memberOutcomes: {
          onTrack,
          slipping,
          offTrack,
          avgConsistencyScore,
        },
      };
    });

    // Sort by assigned member count (most active coaches first)
    coachPerformance.sort((a, b) => b.assignedMemberCount - a.assignedMemberCount);

    // Calculate gym summary
    const totalMembers = await prisma.member.count({
      where: { gymId: session.gymId },
    });

    const summary = {
      totalCoaches: coaches.length,
      totalCoachedMembers: assignedMemberIds.length,
      uncoachedMembers: totalMembers - assignedMemberIds.length,
      overallMemberStatus: {
        onTrack: [...memberStatusMap.values()].filter(m => m.status === "on_track").length,
        slipping: [...memberStatusMap.values()].filter(m => m.status === "slipping").length,
        offTrack: [...memberStatusMap.values()].filter(m => m.status === "off_track").length,
      },
    };

    return NextResponse.json({
      coaches: coachPerformance,
      summary,
    });
  } catch (error) {
    console.error("Coach performance error:", error);
    return NextResponse.json(
      { error: "Failed to load coach performance" },
      { status: 500 }
    );
  }
}
