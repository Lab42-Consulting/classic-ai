import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  generateAgentResponse,
  isValidAgentType,
  AgentChatMessage,
  AgentChatContext,
} from "@/lib/ai/agents";
import { calculateDailyTargets, Goal } from "@/lib/calculations";
import {
  checkRateLimit,
  incrementUsage,
  checkGymBudget,
  trackAIUsage,
} from "@/lib/ai/cache";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type: agentType } = await params;

    // Validate agent type
    if (!isValidAgentType(agentType)) {
      return NextResponse.json(
        { error: "Invalid agent type" },
        { status: 400 }
      );
    }

    const session = await getSession();

    if (!session || session.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get member with gym and coach assignment
    const member = await prisma.member.findUnique({
      where: { id: session.userId },
      include: {
        gym: true,
        coachAssignment: {
          include: { staff: true },
        },
      },
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

    // Check rate limit
    const rateLimit = await checkRateLimit(
      session.userId,
      member.subscriptionStatus
    );
    if (!rateLimit.allowed) {
      const message =
        member.subscriptionStatus === "trial"
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
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    // Validate and limit history
    const validHistory: AgentChatMessage[] = Array.isArray(history)
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

    // Get coach's knowledge for this specific agent and member (if member has a coach)
    let coachKnowledge: string | null = null;
    if (member.coachAssignment) {
      const knowledge = await prisma.coachKnowledge.findUnique({
        where: {
          staffId_memberId_agentType: {
            staffId: member.coachAssignment.staffId,
            memberId: member.id,
            agentType,
          },
        },
      });
      coachKnowledge = knowledge?.content || null;
    }

    // Gather context for AI
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [todayLogs, last7DaysLogs] = await Promise.all([
      prisma.dailyLog.findMany({
        where: {
          memberId: session.userId,
          date: { gte: today },
        },
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
    ]);

    // Use coach-set custom targets if available, otherwise auto-calculate
    const autoTargets = calculateDailyTargets(
      member.weight || 70,
      member.goal as Goal
    );
    const coachTargets = member.coachAssignment;
    const targets = {
      calories: coachTargets?.customCalories || autoTargets.calories,
      protein: coachTargets?.customProtein || autoTargets.protein,
      carbs: coachTargets?.customCarbs || autoTargets.carbs,
      fats: coachTargets?.customFats || autoTargets.fats,
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
      carbs: todayLogs.reduce(
        (sum, log) => sum + (log.estimatedCarbs || 0),
        0
      ),
      fats: todayLogs.reduce((sum, log) => sum + (log.estimatedFats || 0), 0),
    };

    const trainedToday = todayLogs.some((log) => log.type === "training");
    const waterGlasses = todayLogs.filter((log) => log.type === "water").length;

    // Calculate weekly training sessions
    const weeklyTrainingSessions = last7DaysLogs.filter(
      (log) => log.type === "training"
    ).length;

    // Calculate consistency score (simplified)
    const daysWithActivity = new Set(
      last7DaysLogs.map((log) => log.date.toISOString().split("T")[0])
    ).size;
    const consistencyScore = Math.min(100, Math.round((daysWithActivity / 7) * 100));

    const context: AgentChatContext = {
      memberName: member.name,
      goal: member.goal,
      currentWeight: member.weight,
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
    };

    // Build conversation with current message
    const conversationHistory: AgentChatMessage[] = [
      ...validHistory,
      { role: "user", content: message },
    ];

    // Generate response using agent-specific prompt
    const aiResponse = await generateAgentResponse(
      agentType,
      conversationHistory,
      context,
      coachKnowledge
    );

    // Track usage and costs
    if (!aiResponse.error) {
      await Promise.all([
        incrementUsage(session.userId),
        trackAIUsage(member.gymId, aiResponse.tokensIn, aiResponse.tokensOut),
      ]);
    } else {
      await incrementUsage(session.userId);
    }

    // Save to chat history with agent type
    await prisma.chatMessage.createMany({
      data: [
        {
          memberId: session.userId,
          role: "user",
          content: message,
          agentType,
        },
        {
          memberId: session.userId,
          role: "assistant",
          content: aiResponse.text,
          agentType,
        },
      ],
    });

    return NextResponse.json({
      response: aiResponse.text,
      remaining: rateLimit.remaining - 1,
      limit: rateLimit.limit,
    });
  } catch (error) {
    console.error("Agent chat error:", error);
    return NextResponse.json(
      { error: "Failed to get response" },
      { status: 500 }
    );
  }
}
