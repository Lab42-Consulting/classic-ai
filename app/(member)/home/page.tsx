import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { HomeClient } from "./home-client";
import {
  calculateDailyTargets,
  calculateDailyStatus,
  calculateMacroPercentages,
  calculateMacroStatus,
  Goal,
} from "@/lib/calculations";
import { getChallengeStatus, canJoinChallenge, getDaysUntilJoinDeadline, getDaysUntilStart } from "@/lib/challenges";

interface DailyLogData {
  date: Date;
  type: string;
  estimatedCalories: number | null;
  estimatedProtein: number | null;
}

async function getMemberData(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      gym: true,
      coachAssignment: true, // Include coach-set custom targets
    },
  });

  if (!member) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayLogs = await prisma.dailyLog.findMany({
    where: {
      memberId,
      date: {
        gte: today,
      },
    },
  });

  // Get last 7 days of logs for consistency calculation
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const last7DaysLogs = await prisma.dailyLog.findMany({
    where: {
      memberId,
      date: {
        gte: sevenDaysAgo,
      },
    },
    select: {
      date: true,
      type: true,
      estimatedCalories: true,
      estimatedProtein: true,
    },
  });

  // Get unseen nudges from coach
  const unseenNudges = await prisma.coachNudge.findMany({
    where: {
      memberId,
      seenAt: null,
    },
    include: {
      staff: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  // Get pending coach request (only coach-initiated requests)
  // Member-initiated requests are just interest signals - they shouldn't show
  // as "coach wants to be your trainer" on the home page
  const pendingCoachRequest = await prisma.coachRequest.findFirst({
    where: {
      memberId,
      initiatedBy: "coach", // Only show requests initiated by coaches with a plan
    },
    include: {
      staff: {
        select: { name: true },
      },
    },
  });

  // Get pending session requests (where member needs to respond)
  const pendingSessionRequests = await prisma.sessionRequest.findMany({
    where: {
      memberId,
      status: { in: ["pending", "countered"] },
      lastActionBy: "coach", // Coach made the last action, member needs to respond
    },
    include: {
      staff: {
        select: { id: true, name: true },
      },
    },
    orderBy: { lastActionAt: "desc" },
    take: 3, // Show max 3 on home page
  });

  // Get upcoming confirmed sessions (next 7 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const upcomingSessions = await prisma.scheduledSession.findMany({
    where: {
      memberId,
      status: "confirmed",
      scheduledAt: {
        gte: new Date(),
        lte: nextWeek,
      },
    },
    include: {
      staff: {
        select: { id: true, name: true },
      },
    },
    orderBy: { scheduledAt: "asc" },
    take: 2, // Show max 2 on home page
  });

  // Get active or upcoming challenge (if any)
  // Note: We don't filter by startDate to also show upcoming challenges
  // Status must be "registration" or "active" (not "draft" - those are admin-only)
  const now = new Date();
  const activeChallenge = await prisma.challenge.findFirst({
    where: {
      gymId: member.gymId,
      status: { in: ["registration", "active"] },
      endDate: { gte: now },
    },
    include: {
      _count: {
        select: { participants: true },
      },
    },
  });

  // Check if member is participating and get their stats
  let isParticipating = false;
  let participationData: { totalPoints: number; rank: number } | null = null;
  if (activeChallenge) {
    const participation = await prisma.challengeParticipant.findUnique({
      where: {
        challengeId_memberId: {
          challengeId: activeChallenge.id,
          memberId,
        },
      },
    });
    isParticipating = !!participation;

    if (participation) {
      // Get member's rank
      const higherRanked = await prisma.challengeParticipant.count({
        where: {
          challengeId: activeChallenge.id,
          OR: [
            { totalPoints: { gt: participation.totalPoints } },
            {
              AND: [
                { totalPoints: participation.totalPoints },
                { joinedAt: { lt: participation.joinedAt } },
              ],
            },
          ],
        },
      });
      participationData = {
        totalPoints: participation.totalPoints,
        rank: higherRanked + 1,
      };
    }
  }

  return {
    member,
    todayLogs,
    last7DaysLogs,
    unseenNudges,
    pendingCoachRequest,
    pendingSessionRequests,
    upcomingSessions,
    activeChallenge,
    isParticipating,
    participationData,
  };
}

function calculateWeeklyStats(
  logs: DailyLogData[],
  targetCalories: number,
  targetProtein: number
) {
  // Group logs by date
  const logsByDate = new Map<string, DailyLogData[]>();

  for (const log of logs) {
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
    // Count training sessions
    const trainingCount = dayLogs.filter((l) => l.type === "training").length;
    trainingSessions += trainingCount;

    // Check if meals were logged
    const hasMeals = dayLogs.some((l) => l.type === "meal");
    if (hasMeals) daysWithMeals++;

    // Calculate calorie adherence for this day
    const dayCalories = dayLogs.reduce(
      (sum, l) => sum + (l.estimatedCalories || 0),
      0
    );
    if (dayCalories > 0) {
      const calorieAdherence = (dayCalories / targetCalories) * 100;
      totalCalorieAdherence += calorieAdherence;
      daysWithCalories++;
    }

    // Calculate protein adherence
    const dayProtein = dayLogs.reduce(
      (sum, l) => sum + (l.estimatedProtein || 0),
      0
    );
    if (dayProtein > 0) {
      const proteinAdherence = (dayProtein / targetProtein) * 100;
      totalProteinAdherence += proteinAdherence;
    }

    // Check water consistency (4+ glasses)
    const waterCount = dayLogs.filter((l) => l.type === "water").length;
    if (waterCount >= 4) waterConsistentDays++;
  }

  const avgCalorieAdherence =
    daysWithCalories > 0 ? totalCalorieAdherence / daysWithCalories : 0;
  const avgProteinAdherence =
    daysWithCalories > 0 ? totalProteinAdherence / daysWithCalories : 0;

  return {
    trainingSessions,
    daysWithMeals,
    avgCalorieAdherence,
    avgProteinAdherence,
    waterConsistency: waterConsistentDays,
  };
}

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Determine the member ID to use
  let memberId = session.userId;
  let isStaffMember = false;

  // If staff, check for linked member account
  if (session.userType === "staff") {
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { linkedMemberId: true },
    });

    if (!staff?.linkedMemberId) {
      // Staff without linked member - redirect to dashboard
      redirect("/dashboard");
    }

    memberId = staff.linkedMemberId;
    isStaffMember = true;
  } else if (session.userType !== "member") {
    redirect("/login");
  }

  const data = await getMemberData(memberId);

  if (!data) {
    redirect("/login");
  }

  const { member, todayLogs, last7DaysLogs, unseenNudges, pendingCoachRequest, pendingSessionRequests, upcomingSessions, activeChallenge, isParticipating, participationData } = data;

  // Redirect new users to onboarding explainer
  if (!member.hasSeenOnboarding) {
    redirect("/why-this-works");
  }

  // Priority: Coach targets > Member custom targets > Auto-calculated
  const autoTargets = calculateDailyTargets(
    member.weight || 70,
    member.goal as Goal
  );

  const coachTargets = member.coachAssignment;
  const targets = {
    calories: coachTargets?.customCalories || member.customCalories || autoTargets.calories,
    protein: coachTargets?.customProtein || member.customProtein || autoTargets.protein,
    carbs: coachTargets?.customCarbs || member.customCarbs || autoTargets.carbs,
    fats: coachTargets?.customFats || member.customFats || autoTargets.fats,
  };

  const consumed = {
    calories: todayLogs.reduce(
      (sum, log) => sum + (log.estimatedCalories || 0),
      0
    ),
    protein: todayLogs.reduce(
      (sum, log) => sum + (log.estimatedProtein || 0),
      0
    ),
    carbs: todayLogs.reduce((sum, log) => sum + (log.estimatedCarbs || 0), 0),
    fats: todayLogs.reduce((sum, log) => sum + (log.estimatedFats || 0), 0),
  };

  // Today's activity counts
  const trainingCountToday = todayLogs.filter(
    (log) => log.type === "training"
  ).length;
  const waterGlasses = todayLogs.filter((log) => log.type === "water").length;
  const mealsToday = todayLogs.filter((log) => log.type === "meal").length;

  const status = calculateDailyStatus({
    consumedCalories: consumed.calories,
    consumedProtein: consumed.protein,
    consumedCarbs: consumed.carbs,
    consumedFats: consumed.fats,
    targetCalories: targets.calories,
    targetProtein: targets.protein,
    targetCarbs: targets.carbs,
    targetFats: targets.fats,
    trainedToday: trainingCountToday > 0,
    waterGlasses,
  });

  // Calculate weekly stats (for contextual advice)
  const weeklyStats = calculateWeeklyStats(
    last7DaysLogs,
    targets.calories,
    targets.protein
  );

  const macroPercentages = calculateMacroPercentages(
    consumed.protein,
    consumed.carbs,
    consumed.fats
  );

  const homeData = {
    memberName: member.name,
    memberAvatarUrl: member.avatarUrl,
    hasCoach: !!member.coachAssignment,
    status,
    caloriesRemaining: Math.max(0, targets.calories - consumed.calories),
    targetCalories: targets.calories,
    consumedCalories: consumed.calories,
    // Macro data for display and contextual prompts
    consumedProtein: consumed.protein,
    targetProtein: targets.protein,
    consumedCarbs: consumed.carbs,
    targetCarbs: targets.carbs,
    consumedFats: consumed.fats,
    targetFats: targets.fats,
    macros: {
      protein: {
        percentage: macroPercentages.protein,
        status: calculateMacroStatus(consumed.protein, targets.protein),
      },
      carbs: {
        percentage: macroPercentages.carbs,
        status: calculateMacroStatus(consumed.carbs, targets.carbs),
      },
      fats: {
        percentage: macroPercentages.fats,
        status: calculateMacroStatus(consumed.fats, targets.fats),
      },
    },
    // Today's activity (all daily metrics for stats row)
    trainingCountToday,
    waterGlasses,
    mealsToday,
    // Weekly data (for contextual advice, not displayed in stats row)
    weeklyTrainingSessions: weeklyStats.trainingSessions,
    // Coach nudges
    nudges: unseenNudges.map((nudge) => ({
      id: nudge.id,
      message: nudge.message,
      coachName: nudge.staff.name,
      createdAt: nudge.createdAt.toISOString(),
    })),
    // Pending coach request
    pendingCoachRequest: pendingCoachRequest
      ? {
          id: pendingCoachRequest.id,
          coachName: pendingCoachRequest.staff.name,
          customGoal: pendingCoachRequest.customGoal,
          customCalories: pendingCoachRequest.customCalories,
          customProtein: pendingCoachRequest.customProtein,
          customCarbs: pendingCoachRequest.customCarbs,
          customFats: pendingCoachRequest.customFats,
          createdAt: pendingCoachRequest.createdAt.toISOString(),
        }
      : null,
    // Staff viewing as member
    isStaffMember,
    // Active or upcoming challenge (show always - different content based on participation)
    activeChallenge: activeChallenge
      ? (() => {
          const status = getChallengeStatus(activeChallenge);
          const isUpcoming = status === "upcoming";
          const canJoin = canJoinChallenge(activeChallenge);
          // If not participating, only show if upcoming or can join
          if (!isParticipating && !isUpcoming && !canJoin) return null;
          return {
            id: activeChallenge.id,
            name: activeChallenge.name,
            rewardDescription: activeChallenge.rewardDescription,
            participantCount: activeChallenge._count.participants,
            daysUntilDeadline: isUpcoming ? null : getDaysUntilJoinDeadline(activeChallenge),
            daysUntilStart: isUpcoming ? getDaysUntilStart(activeChallenge) : null,
            isUpcoming,
            isParticipating,
            participation: participationData,
          };
        })()
      : null,
    // Session requests requiring member action
    pendingSessionRequests: pendingSessionRequests.map((req) => ({
      id: req.id,
      coachId: req.staff.id,
      coachName: req.staff.name,
      sessionType: req.sessionType,
      proposedAt: req.proposedAt.toISOString(),
      duration: req.duration,
      location: req.location,
      note: req.note,
      status: req.status,
      counterCount: req.counterCount,
      lastActionAt: req.lastActionAt.toISOString(),
    })),
    // Upcoming confirmed sessions
    upcomingSessions: upcomingSessions.map((session) => ({
      id: session.id,
      coachId: session.staff.id,
      coachName: session.staff.name,
      sessionType: session.sessionType,
      scheduledAt: session.scheduledAt.toISOString(),
      duration: session.duration,
      location: session.location,
    })),
  };

  return <HomeClient data={homeData} />;
}
