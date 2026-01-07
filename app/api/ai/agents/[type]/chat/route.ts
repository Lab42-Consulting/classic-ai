import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  generateAgentResponse,
  isValidAgentType,
  AgentChatMessage,
  AgentChatContext,
} from "@/lib/ai/agents";
import { calculateDailyTargets, Goal } from "@/lib/calculations";
import {
  checkAndIncrementRateLimitWithTier,
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

    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    // Get member with gym and coach assignment
    const member = await prisma.member.findUnique({
      where: { id: authResult.memberId },
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

    // Check and atomically increment rate limit (tier-aware, prevents race conditions)
    const gymTier = member.gym?.subscriptionTier || "starter";
    const rateLimit = await checkAndIncrementRateLimitWithTier(
      authResult.memberId,
      member.subscriptionStatus,
      gymTier
    );
    if (!rateLimit.allowed) {
      const message =
        member.subscriptionStatus === "trial"
          ? "Dostigao si dnevni limit poruka (5). Nadogradi članarinu za više poruka."
          : `Dostigao si dnevni limit poruka (${rateLimit.limit}). Pokušaj ponovo sutra.`;

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
          memberId: authResult.memberId,
          date: { gte: today },
        },
      }),
      prisma.dailyLog.findMany({
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

    // Track usage and costs (usage already incremented atomically at rate limit check)
    if (!aiResponse.error) {
      await trackAIUsage(member.gymId, aiResponse.tokensIn, aiResponse.tokensOut);
    }

    // Save to chat history with agent type
    await prisma.chatMessage.createMany({
      data: [
        {
          memberId: authResult.memberId,
          role: "user",
          content: message,
          agentType,
        },
        {
          memberId: authResult.memberId,
          role: "assistant",
          content: aiResponse.text,
          agentType,
        },
      ],
    });

    return NextResponse.json({
      response: aiResponse.text,
      remaining: rateLimit.remaining,
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
