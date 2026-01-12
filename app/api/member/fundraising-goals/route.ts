import { NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * GET /api/member/fundraising-goals
 * Get active visible fundraising goals for the member's gym
 */
export async function GET() {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const member = await prisma.member.findUnique({
      where: { id: authResult.memberId },
      select: { gymId: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get active, visible fundraising goals
    const goals = await prisma.fundraisingGoal.findMany({
      where: {
        gymId: member.gymId,
        status: "active",
        isVisible: true,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        targetAmount: true,
        currentAmount: true,
        imageUrl: true,
        startDate: true,
        endDate: true,
      },
    });

    // Also get recently completed goals (last 30 days) for celebration
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentlyCompleted = await prisma.fundraisingGoal.findMany({
      where: {
        gymId: member.gymId,
        status: "completed",
        isVisible: true,
        completedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { completedAt: "desc" },
      take: 3,
      select: {
        id: true,
        name: true,
        description: true,
        targetAmount: true,
        currentAmount: true,
        imageUrl: true,
        completedAt: true,
      },
    });

    // Convert amounts to euros and add progress percentage
    const activeGoals = goals.map((goal) => ({
      ...goal,
      targetAmountEuros: goal.targetAmount / 100,
      currentAmountEuros: goal.currentAmount / 100,
      progressPercentage: Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)),
    }));

    const completedGoals = recentlyCompleted.map((goal) => ({
      ...goal,
      targetAmountEuros: goal.targetAmount / 100,
      currentAmountEuros: goal.currentAmount / 100,
      progressPercentage: 100,
    }));

    return NextResponse.json({
      activeGoals,
      recentlyCompleted: completedGoals,
    });
  } catch (error) {
    console.error("Error fetching fundraising goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch fundraising goals" },
      { status: 500 }
    );
  }
}
