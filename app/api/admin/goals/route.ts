import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { checkFeatureAccess } from "@/lib/subscription/guards";
import {
  getGoalStatus,
  isSingleOptionGoal,
  calculateProgress,
  centsToEuros,
  eurosToCents,
} from "@/lib/goals";
import { closeExpiredVoting } from "@/lib/goals/voting";

/**
 * GET /api/admin/goals
 * List all goals for the gym with options and vote counts
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Check tier access (Pro feature - reuse challenges gate)
    const featureCheck = await checkFeatureAccess(staff.gymId, "challenges");
    if (!featureCheck.allowed) {
      return NextResponse.json(
        {
          error: featureCheck.error,
          code: "TIER_REQUIRED",
          requiredTier: featureCheck.requiredTier,
          currentTier: featureCheck.tier,
        },
        { status: 403 }
      );
    }

    // Auto-close any expired voting goals
    await closeExpiredVoting(staff.gymId);

    // Fetch all goals with options and vote counts
    const goals = await prisma.goal.findMany({
      where: { gymId: staff.gymId },
      include: {
        options: {
          orderBy: [{ voteCount: "desc" }, { displayOrder: "asc" }],
        },
        _count: {
          select: {
            votes: true,
            contributions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform goals for response
    const goalsWithDetails = goals.map((goal) => {
      const totalVotes = goal.options.reduce((sum, opt) => sum + opt.voteCount, 0);
      const winningOption = goal.options.find((o) => o.id === goal.winningOptionId);
      const targetAmount = winningOption?.targetAmount ?? goal.options[0]?.targetAmount ?? 0;

      return {
        id: goal.id,
        name: goal.name,
        description: goal.description,
        status: getGoalStatus(goal),
        isVisible: goal.isVisible,
        votingEndsAt: goal.votingEndsAt,
        votingEndedAt: goal.votingEndedAt,
        completedAt: goal.completedAt,
        createdAt: goal.createdAt,
        // Voting info
        totalVotes,
        voteCount: goal._count.votes,
        // Fundraising info
        currentAmount: centsToEuros(goal.currentAmount),
        targetAmount: centsToEuros(targetAmount),
        progressPercentage: calculateProgress(goal.currentAmount, targetAmount),
        contributionCount: goal._count.contributions,
        // Options
        options: goal.options.map((opt, index) => ({
          id: opt.id,
          name: opt.name,
          description: opt.description,
          imageUrl: opt.imageUrl,
          targetAmount: centsToEuros(opt.targetAmount),
          voteCount: opt.voteCount,
          percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
          isWinner: opt.id === goal.winningOptionId,
          displayOrder: opt.displayOrder,
        })),
        winningOptionId: goal.winningOptionId,
      };
    });

    return NextResponse.json({ goals: goalsWithDetails });
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

/**
 * POST /api/admin/goals
 * Create a new goal with options
 *
 * Request body:
 * {
 *   name: string;
 *   description?: string;
 *   options: Array<{
 *     name: string;
 *     description?: string;
 *     imageUrl?: string;
 *     targetAmount: number; // euros
 *   }>;
 *   votingEndsAt?: string; // ISO date (required if options.length > 1)
 *   isVisible?: boolean;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Check tier access
    const featureCheck = await checkFeatureAccess(staff.gymId, "challenges");
    if (!featureCheck.allowed) {
      return NextResponse.json(
        {
          error: featureCheck.error,
          code: "TIER_REQUIRED",
          requiredTier: featureCheck.requiredTier,
          currentTier: featureCheck.tier,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, options, votingEndsAt, isVisible = true } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Naziv cilja je obavezan" }, { status: 400 });
    }

    if (!options || !Array.isArray(options) || options.length === 0) {
      return NextResponse.json(
        { error: "Potrebna je najmanje jedna opcija" },
        { status: 400 }
      );
    }

    // Validate options
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (!opt.name || typeof opt.name !== "string" || opt.name.trim().length === 0) {
        return NextResponse.json(
          { error: `Opcija ${i + 1}: naziv je obavezan` },
          { status: 400 }
        );
      }
      if (!opt.targetAmount || typeof opt.targetAmount !== "number" || opt.targetAmount <= 0) {
        return NextResponse.json(
          { error: `Opcija ${i + 1}: ciljni iznos mora biti veći od 0` },
          { status: 400 }
        );
      }
    }

    // Multi-option goals require voting deadline
    const isMultiOption = options.length > 1;
    if (isMultiOption && !votingEndsAt) {
      return NextResponse.json(
        { error: "Rok za glasanje je obavezan kada ima više opcija" },
        { status: 400 }
      );
    }

    // Validate voting deadline is in the future
    if (votingEndsAt) {
      const deadline = new Date(votingEndsAt);
      if (deadline <= new Date()) {
        return NextResponse.json(
          { error: "Rok za glasanje mora biti u budućnosti" },
          { status: 400 }
        );
      }
    }

    // Determine initial status
    // Single option: go straight to draft (publish will set to fundraising)
    // Multi option: go to draft (publish will set to voting)
    const initialStatus = "draft";

    // Create goal with options in a transaction
    const goal = await prisma.$transaction(async (tx) => {
      // Create the goal
      const createdGoal = await tx.goal.create({
        data: {
          gymId: staff.gymId,
          name: name.trim(),
          description: description?.trim() || null,
          status: initialStatus,
          votingEndsAt: isMultiOption && votingEndsAt ? new Date(votingEndsAt) : null,
          isVisible,
        },
      });

      // Create options
      const createdOptions = await Promise.all(
        options.map((opt: { name: string; description?: string; imageUrl?: string; targetAmount: number }, index: number) =>
          tx.goalOption.create({
            data: {
              goalId: createdGoal.id,
              name: opt.name.trim(),
              description: opt.description?.trim() || null,
              imageUrl: opt.imageUrl || null,
              targetAmount: eurosToCents(opt.targetAmount),
              displayOrder: index,
            },
          })
        )
      );

      // For single-option goals, set the winning option immediately
      if (isSingleOptionGoal(options.length)) {
        await tx.goal.update({
          where: { id: createdGoal.id },
          data: { winningOptionId: createdOptions[0].id },
        });
      }

      return tx.goal.findUnique({
        where: { id: createdGoal.id },
        include: { options: true },
      });
    });

    if (!goal) {
      return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      goal: {
        id: goal.id,
        name: goal.name,
        description: goal.description,
        status: goal.status,
        isVisible: goal.isVisible,
        votingEndsAt: goal.votingEndsAt,
        options: goal.options.map((opt) => ({
          id: opt.id,
          name: opt.name,
          description: opt.description,
          imageUrl: opt.imageUrl,
          targetAmount: centsToEuros(opt.targetAmount),
          voteCount: opt.voteCount,
          displayOrder: opt.displayOrder,
        })),
        isSingleOption: isSingleOptionGoal(goal.options.length),
      },
    });
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}
