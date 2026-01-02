import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { generateAIResponse, ChatMessage } from "@/lib/ai";
import {
  calculateDailyTargets,
  calculateStreak,
  calculateConsistencyScore,
  Goal,
} from "@/lib/calculations";
import {
  checkRateLimit,
  incrementUsage,
  getCachedResponse,
  cacheResponse,
  checkGymBudget,
  trackAIUsage,
} from "@/lib/ai/cache";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get member with subscription status, gym, and coach assignment
    const member = await prisma.member.findUnique({
      where: { id: session.userId },
      include: { gym: true, coachAssignment: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check gym's monthly budget cap
    const budgetCheck = await checkGymBudget(member.gymId);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        {
          error: "AI asistent je privremeno nedostupan. Pokušaj ponovo kasnije.",
          budgetExceeded: true,
        },
        { status: 503 }
      );
    }

    // Check rate limit based on subscription status (trial: 5/day, active: 20/day)
    const rateLimit = await checkRateLimit(session.userId, member.subscriptionStatus);
    if (!rateLimit.allowed) {
      const message = member.subscriptionStatus === "trial"
        ? "Dostigao si dnevni limit poruka (5). Nadogradi članarinu za više poruka."
        : "Dostigao si dnevni limit poruka (20). Pokušaj ponovo sutra.";

      return NextResponse.json(
        {
          error: message,
          remaining: 0,
          limit: rateLimit.limit,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== "string" || message.length > 500) {
      return NextResponse.json(
        { error: "Invalid message" },
        { status: 400 }
      );
    }

    // Use history from frontend (not database) to ensure fresh sessions
    // Limit to last 10 messages for context window management
    const validHistory: ChatMessage[] = Array.isArray(history)
      ? history
          .filter(
            (m: { role?: string; content?: string }) =>
              m.role &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string"
          )
          .slice(-10)
          .map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
      : [];

    // Check cache for common questions (saves API costs)
    const cachedResponse = await getCachedResponse(message);
    if (cachedResponse) {
      // Increment usage even for cached responses
      await incrementUsage(session.userId);

      // Save to chat history
      await prisma.chatMessage.createMany({
        data: [
          { memberId: session.userId, role: "user", content: message },
          { memberId: session.userId, role: "assistant", content: cachedResponse },
        ],
      });

      return NextResponse.json({
        response: cachedResponse,
        cached: true,
        remaining: rateLimit.remaining - 1,
        limit: rateLimit.limit,
      });
    }

    // Gather context for AI
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [todayLogs, last30DaysLogs, last7DaysLogs, weeklyCheckins] = await Promise.all([
      prisma.dailyLog.findMany({
        where: {
          memberId: session.userId,
          date: { gte: today },
        },
      }),
      prisma.dailyLog.findMany({
        where: {
          memberId: session.userId,
          date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { date: true },
      }),
      prisma.dailyLog.findMany({
        where: {
          memberId: session.userId,
          date: { gte: sevenDaysAgo },
        },
        select: {
          date: true,
          type: true,
          estimatedCalories: true,
          estimatedProtein: true,
        },
      }),
      prisma.weeklyCheckin.findMany({
        where: { memberId: session.userId },
        orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
        take: 4,
      }),
    ]);

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
      calories: todayLogs.reduce((sum, log) => sum + (log.estimatedCalories || 0), 0),
      protein: todayLogs.reduce((sum, log) => sum + (log.estimatedProtein || 0), 0),
      carbs: todayLogs.reduce((sum, log) => sum + (log.estimatedCarbs || 0), 0),
      fats: todayLogs.reduce((sum, log) => sum + (log.estimatedFats || 0), 0),
    };

    const trainedToday = todayLogs.some((log) => log.type === "training");
    const waterGlasses = todayLogs.filter((log) => log.type === "water").length;
    const streak = calculateStreak(last30DaysLogs.map((l) => l.date));

    // Calculate weekly stats for consistency score
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
    let totalCalorieAdherence = 0;
    let totalProteinAdherence = 0;
    let daysWithCalories = 0;
    let waterConsistentDays = 0;

    for (const [, dayLogs] of logsByDate) {
      weeklyTrainingSessions += dayLogs.filter((l) => l.type === "training").length;
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

    const consistencyScore = calculateConsistencyScore({
      trainingSessions: weeklyTrainingSessions,
      daysWithMeals,
      avgCalorieAdherence: daysWithCalories > 0 ? totalCalorieAdherence / daysWithCalories : 0,
      avgProteinAdherence: daysWithCalories > 0 ? totalProteinAdherence / daysWithCalories : 0,
      waterConsistency: waterConsistentDays,
    });

    const context = {
      memberName: member.name,
      goal: member.goal,
      currentWeight: member.weight,
      streak,
      todayCalories: consumed.calories,
      targetCalories: targets.calories,
      todayProtein: consumed.protein,
      targetProtein: targets.protein,
      todayCarbs: consumed.carbs,
      targetCarbs: targets.carbs,
      todayFats: consumed.fats,
      targetFats: targets.fats,
      trainedToday,
      weeklyTrainingSessions,
      waterGlasses,
      consistencyScore,
      weeklyCheckins: weeklyCheckins.map((c) => ({
        weight: c.weight,
        feeling: c.feeling,
        weekNumber: c.weekNumber,
      })),
    };

    // Build conversation from frontend history + current message
    const conversationHistory: ChatMessage[] = [
      ...validHistory,
      { role: "user", content: message },
    ];

    const aiResponse = await generateAIResponse(conversationHistory, context);

    // Track usage and costs (only if we actually called the API)
    if (!aiResponse.error) {
      await Promise.all([
        incrementUsage(session.userId),
        trackAIUsage(member.gymId, aiResponse.tokensIn, aiResponse.tokensOut),
        cacheResponse(message, aiResponse.text),
      ]);
    } else {
      // Still increment usage on error to prevent abuse
      await incrementUsage(session.userId);
    }

    // Save to chat history
    await prisma.chatMessage.createMany({
      data: [
        { memberId: session.userId, role: "user", content: message },
        { memberId: session.userId, role: "assistant", content: aiResponse.text },
      ],
    });

    return NextResponse.json({
      response: aiResponse.text,
      cached: false,
      remaining: rateLimit.remaining - 1,
      limit: rateLimit.limit,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to get response" },
      { status: 500 }
    );
  }
}
