import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  canVote,
  calculateProgress,
  getDaysUntilVotingEnds,
  getHoursUntilVotingEnds,
  centsToEuros,
} from "@/lib/goals";
import { closeExpiredVoting, getMemberVote } from "@/lib/goals/voting";

/**
 * GET /api/member/goals
 * Get active goals for the member's gym (voting and fundraising)
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get member with gym info
    const member = await prisma.member.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        gymId: true,
        subscriptionStatus: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Auto-close any expired voting goals
    await closeExpiredVoting(member.gymId);

    // Fetch visible goals that are in voting or fundraising status
    const goals = await prisma.goal.findMany({
      where: {
        gymId: member.gymId,
        isVisible: true,
        status: { in: ["voting", "fundraising"] },
      },
      include: {
        options: {
          orderBy: [{ voteCount: "desc" }, { displayOrder: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Separate voting and fundraising goals
    const votingGoals = [];
    const fundraisingGoals = [];

    for (const goal of goals) {
      const totalVotes = goal.options.reduce((sum, opt) => sum + opt.voteCount, 0);

      if (goal.status === "voting" && canVote(goal)) {
        // Get member's current vote for this goal
        const memberVoteOptionId = await getMemberVote(goal.id, member.id);

        votingGoals.push({
          id: goal.id,
          name: goal.name,
          description: goal.description,
          votingEndsAt: goal.votingEndsAt,
          daysUntilDeadline: getDaysUntilVotingEnds(goal),
          hoursUntilDeadline: getHoursUntilVotingEnds(goal),
          totalVotes,
          myVoteOptionId: memberVoteOptionId,
          options: goal.options.map((opt) => ({
            id: opt.id,
            name: opt.name,
            description: opt.description,
            imageUrl: opt.imageUrl,
            targetAmount: centsToEuros(opt.targetAmount),
            voteCount: opt.voteCount,
            percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
          })),
        });
      } else if (goal.status === "fundraising") {
        const winningOption = goal.options.find((o) => o.id === goal.winningOptionId);

        if (winningOption) {
          fundraisingGoals.push({
            id: goal.id,
            name: goal.name,
            description: goal.description,
            winningOption: {
              id: winningOption.id,
              name: winningOption.name,
              description: winningOption.description,
              imageUrl: winningOption.imageUrl,
              targetAmount: centsToEuros(winningOption.targetAmount),
            },
            currentAmount: centsToEuros(goal.currentAmount),
            targetAmount: centsToEuros(winningOption.targetAmount),
            progressPercentage: calculateProgress(goal.currentAmount, winningOption.targetAmount),
          });
        }
      }
    }

    // Also fetch recently completed goals (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentlyCompleted = await prisma.goal.findMany({
      where: {
        gymId: member.gymId,
        isVisible: true,
        status: "completed",
        completedAt: { gte: thirtyDaysAgo },
      },
      include: {
        options: true,
      },
      orderBy: { completedAt: "desc" },
      take: 3,
    });

    const completedGoals = recentlyCompleted.map((goal) => {
      const winningOption = goal.options.find((o) => o.id === goal.winningOptionId);
      return {
        id: goal.id,
        name: goal.name,
        description: goal.description,
        completedAt: goal.completedAt,
        winningOption: winningOption
          ? {
              id: winningOption.id,
              name: winningOption.name,
              imageUrl: winningOption.imageUrl,
            }
          : null,
      };
    });

    return NextResponse.json({
      votingGoals,
      fundraisingGoals,
      recentlyCompleted: completedGoals,
    });
  } catch (error) {
    console.error("Error fetching member goals:", error);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}
