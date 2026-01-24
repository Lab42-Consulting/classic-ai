import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { castVote } from "@/lib/goals/voting";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/member/goals/[id]/vote
 * Cast or change a vote on a goal
 *
 * Request body:
 * { optionId: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: goalId } = await params;
    const session = await getSession();

    if (!session || session.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get member with subscription status
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

    // Verify member has active subscription
    if (member.subscriptionStatus !== "active" && member.subscriptionStatus !== "trial") {
      return NextResponse.json(
        { error: "Aktivna pretplata je potrebna za glasanje" },
        { status: 403 }
      );
    }

    // Verify goal belongs to member's gym
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        gymId: member.gymId,
      },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { optionId } = body;

    if (!optionId || typeof optionId !== "string") {
      return NextResponse.json(
        { error: "optionId je obavezan" },
        { status: 400 }
      );
    }

    // Cast the vote
    const result = await castVote(goalId, member.id, optionId);

    if (!result.success) {
      // Map error codes to user-friendly messages
      const errorMessages: Record<string, string> = {
        GOAL_NOT_FOUND: "Cilj nije pronađen",
        VOTING_NOT_ACTIVE: "Glasanje nije aktivno",
        VOTING_ENDED: "Glasanje je završeno",
        INVALID_OPTION: "Nevažeća opcija",
        TRANSACTION_CONFLICT: "Greška - pokušajte ponovo",
        INTERNAL_ERROR: "Greška servera",
      };

      return NextResponse.json(
        { error: errorMessages[result.error || "INTERNAL_ERROR"] || "Greška" },
        { status: 400 }
      );
    }

    // Get updated vote counts for the goal
    const updatedGoal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        options: {
          orderBy: [{ voteCount: "desc" }, { displayOrder: "asc" }],
        },
      },
    });

    if (!updatedGoal) {
      return NextResponse.json({ success: true });
    }

    const totalVotes = updatedGoal.options.reduce((sum, opt) => sum + opt.voteCount, 0);

    return NextResponse.json({
      success: true,
      changed: result.changed,
      previousOptionId: result.previousOptionId,
      newOptionId: result.newOptionId,
      // Return updated vote counts
      options: updatedGoal.options.map((opt) => ({
        id: opt.id,
        voteCount: opt.voteCount,
        percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
      })),
      totalVotes,
    });
  } catch (error) {
    console.error("Error casting vote:", error);
    return NextResponse.json({ error: "Failed to cast vote" }, { status: 500 });
  }
}
