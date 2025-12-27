import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { generateAIResponse, ChatMessage } from "@/lib/ai";
import { calculateDailyTargets, calculateStreak, Goal } from "@/lib/calculations";
import { checkRateLimit, getCachedResponse, cacheResponse } from "@/lib/ai/cache";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit (30 messages per day)
    const rateLimit = checkRateLimit(session.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Dostigao si dnevni limit poruka. Pokušaj ponovo sutra.",
          remaining: 0,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string" || message.length > 500) {
      return NextResponse.json(
        { error: "Invalid message" },
        { status: 400 }
      );
    }

    // Check cache for common questions (saves API costs)
    const cachedResponse = getCachedResponse(message);
    if (cachedResponse) {
      // Save to chat history even for cached responses
      await prisma.chatMessage.createMany({
        data: [
          { memberId: session.userId, role: "user", content: message },
          { memberId: session.userId, role: "assistant", content: cachedResponse },
        ],
      });

      return NextResponse.json({
        response: cachedResponse,
        cached: true,
        remaining: rateLimit.remaining,
      });
    }

    const member = await prisma.member.findUnique({
      where: { id: session.userId },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = await prisma.dailyLog.findMany({
      where: {
        memberId: session.userId,
        date: { gte: today },
      },
    });

    const last30DaysLogs = await prisma.dailyLog.findMany({
      where: {
        memberId: session.userId,
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { date: true },
    });

    const weeklyCheckins = await prisma.weeklyCheckin.findMany({
      where: { memberId: session.userId },
      orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
      take: 4,
    });

    const recentMessages = await prisma.chatMessage.findMany({
      where: { memberId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    const targets = calculateDailyTargets(
      member.weight || 70,
      member.goal as Goal
    );

    const consumed = {
      calories: todayLogs.reduce((sum, log) => sum + (log.estimatedCalories || 0), 0),
      protein: todayLogs.reduce((sum, log) => sum + (log.estimatedProtein || 0), 0),
    };

    const trainedToday = todayLogs.some((log) => log.type === "training");
    const streak = calculateStreak(last30DaysLogs.map((l) => l.date));

    const context = {
      memberName: member.name,
      goal: member.goal,
      currentWeight: member.weight,
      streak,
      todayCalories: consumed.calories,
      targetCalories: targets.calories,
      todayProtein: consumed.protein,
      targetProtein: targets.protein,
      trainedToday,
      weeklyCheckins: weeklyCheckins.map((c) => ({
        weight: c.weight,
        feeling: c.feeling,
        weekNumber: c.weekNumber,
      })),
    };

    const conversationHistory: ChatMessage[] = recentMessages
      .reverse()
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    conversationHistory.push({ role: "user", content: message });

    const aiResponse = await generateAIResponse(conversationHistory, context);

    // Cache the response for similar future questions
    cacheResponse(message, aiResponse);

    await prisma.chatMessage.createMany({
      data: [
        { memberId: session.userId, role: "user", content: message },
        { memberId: session.userId, role: "assistant", content: aiResponse },
      ],
    });

    return NextResponse.json({
      response: aiResponse,
      cached: false,
      remaining: rateLimit.remaining,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to get response" },
      { status: 500 }
    );
  }
}
