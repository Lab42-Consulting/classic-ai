import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { HomeClient } from "./home-client";
import {
  calculateDailyTargets,
  calculateDailyStatus,
  calculateMacroPercentages,
  calculateMacroStatus,
  calculateConsistencyScore,
  getConsistencyLevel,
  Goal,
} from "@/lib/calculations";

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

  const latestSummary = await prisma.aISummary.findFirst({
    where: {
      memberId,
      type: "daily",
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    member,
    todayLogs,
    last7DaysLogs,
    latestSummary,
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

  if (!session || session.userType !== "member") {
    redirect("/login");
  }

  const data = await getMemberData(session.userId);

  if (!data) {
    redirect("/login");
  }

  const { member, todayLogs, last7DaysLogs, latestSummary } = data;

  // Redirect new users to onboarding explainer
  if (!member.hasSeenOnboarding) {
    redirect("/why-this-works");
  }

  const targets = calculateDailyTargets(
    member.weight || 70,
    member.goal as Goal
  );

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

  // Today's training count
  const trainingCountToday = todayLogs.filter(
    (log) => log.type === "training"
  ).length;
  const waterGlasses = todayLogs.filter((log) => log.type === "water").length;

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

  // Calculate weekly stats for consistency score
  const weeklyStats = calculateWeeklyStats(
    last7DaysLogs,
    targets.calories,
    targets.protein
  );

  const consistencyScore = calculateConsistencyScore(weeklyStats);
  const consistencyLevel = getConsistencyLevel(consistencyScore);

  const macroPercentages = calculateMacroPercentages(
    consumed.protein,
    consumed.carbs,
    consumed.fats
  );

  const homeData = {
    memberName: member.name,
    status,
    caloriesRemaining: Math.max(0, targets.calories - consumed.calories),
    targetCalories: targets.calories,
    consumedCalories: consumed.calories,
    // Protein data for contextual prompts
    consumedProtein: consumed.protein,
    targetProtein: targets.protein,
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
    // New: Consistency score instead of simple streak
    consistencyScore,
    consistencyLevel,
    // Weekly training count (last 7 days)
    weeklyTrainingSessions: weeklyStats.trainingSessions,
    // Today's training count
    trainingCountToday,
    waterGlasses,
    aiSummary: latestSummary?.content || null,
  };

  return <HomeClient data={homeData} />;
}
