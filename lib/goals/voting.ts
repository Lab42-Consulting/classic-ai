/**
 * Goal voting system - atomic vote operations and winner selection
 * Uses Serializable isolation to prevent race conditions
 */

import prisma from "@/lib/db";
import { Prisma, PrismaClient } from "@prisma/client";
import { determineWinner } from "./index";

// Transaction client type
type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface CastVoteResult {
  success: boolean;
  error?: string;
  changed?: boolean;
  previousOptionId?: string;
  newOptionId?: string;
}

export interface SelectWinnerResult {
  success: boolean;
  error?: string;
  winningOption?: {
    id: string;
    name: string;
    voteCount: number;
    targetAmount: number;
  };
}

/**
 * Cast or change a member's vote on a goal
 *
 * Uses Serializable isolation to prevent:
 * - Double voting
 * - Incorrect vote count updates from concurrent requests
 *
 * @param goalId - The goal ID
 * @param memberId - The member's ID
 * @param optionId - The option ID to vote for
 */
export async function castVote(
  goalId: string,
  memberId: string,
  optionId: string
): Promise<CastVoteResult> {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Verify goal exists and is in voting status
        const goal = await tx.goal.findUnique({
          where: { id: goalId },
          select: {
            id: true,
            status: true,
            votingEndsAt: true,
          },
        });

        if (!goal) {
          return { success: false, error: "GOAL_NOT_FOUND" };
        }

        if (goal.status !== "voting") {
          return { success: false, error: "VOTING_NOT_ACTIVE" };
        }

        // Check if voting deadline has passed
        if (goal.votingEndsAt && new Date() > new Date(goal.votingEndsAt)) {
          return { success: false, error: "VOTING_ENDED" };
        }

        // 2. Verify option belongs to this goal
        const option = await tx.goalOption.findFirst({
          where: {
            id: optionId,
            goalId: goalId,
          },
        });

        if (!option) {
          return { success: false, error: "INVALID_OPTION" };
        }

        // 3. Check for existing vote by this member on this goal
        const existingVote = await tx.goalVote.findUnique({
          where: {
            goalId_memberId: {
              goalId,
              memberId,
            },
          },
        });

        // 4. Handle vote change or new vote
        if (existingVote) {
          // Already voted for this option - no change needed
          if (existingVote.optionId === optionId) {
            return {
              success: true,
              changed: false,
              previousOptionId: optionId,
              newOptionId: optionId,
            };
          }

          // Changing vote - decrement old option's vote count
          await tx.goalOption.update({
            where: { id: existingVote.optionId },
            data: { voteCount: { decrement: 1 } },
          });

          // Update the vote record to point to new option
          await tx.goalVote.update({
            where: { id: existingVote.id },
            data: {
              optionId,
              updatedAt: new Date(),
            },
          });

          // Increment new option's vote count
          await tx.goalOption.update({
            where: { id: optionId },
            data: { voteCount: { increment: 1 } },
          });

          return {
            success: true,
            changed: true,
            previousOptionId: existingVote.optionId,
            newOptionId: optionId,
          };
        } else {
          // New vote - create vote record
          await tx.goalVote.create({
            data: {
              goalId,
              memberId,
              optionId,
            },
          });

          // Increment option's vote count
          await tx.goalOption.update({
            where: { id: optionId },
            data: { voteCount: { increment: 1 } },
          });

          return {
            success: true,
            changed: true,
            previousOptionId: undefined,
            newOptionId: optionId,
          };
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 5000,
      }
    );

    return result;
  } catch (error) {
    console.error("Error casting vote:", error);

    // Handle Prisma transaction errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2034") {
        // Transaction conflict - retry logic could be added here
        return { success: false, error: "TRANSACTION_CONFLICT" };
      }
    }

    return { success: false, error: "INTERNAL_ERROR" };
  }
}

/**
 * Select the winning option for a goal and transition to fundraising
 *
 * Winner is determined by:
 * 1. Highest vote count
 * 2. Tie-breaker: lower displayOrder (earlier option wins)
 *
 * @param goalId - The goal ID
 */
export async function selectWinner(goalId: string): Promise<SelectWinnerResult> {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Get the goal with all options
        const goal = await tx.goal.findUnique({
          where: { id: goalId },
          include: {
            options: {
              orderBy: [{ voteCount: "desc" }, { displayOrder: "asc" }],
            },
          },
        });

        if (!goal) {
          return { success: false, error: "GOAL_NOT_FOUND" };
        }

        if (goal.status !== "voting") {
          return { success: false, error: "NOT_IN_VOTING_STATUS" };
        }

        if (goal.options.length === 0) {
          return { success: false, error: "NO_OPTIONS" };
        }

        // 2. Determine the winner
        const winningOption = determineWinner(goal.options);

        if (!winningOption) {
          return { success: false, error: "COULD_NOT_DETERMINE_WINNER" };
        }

        // 3. Update goal to fundraising status
        await tx.goal.update({
          where: { id: goalId },
          data: {
            status: "fundraising",
            winningOptionId: winningOption.id,
            votingEndedAt: new Date(),
          },
        });

        return {
          success: true,
          winningOption: {
            id: winningOption.id,
            name: winningOption.name,
            voteCount: winningOption.voteCount,
            targetAmount: winningOption.targetAmount,
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 5000,
      }
    );

    return result;
  } catch (error) {
    console.error("Error selecting winner:", error);
    return { success: false, error: "INTERNAL_ERROR" };
  }
}

/**
 * Check and close any expired voting goals for a gym
 * Called on API access to handle lazy evaluation of voting deadlines
 *
 * @param gymId - The gym ID
 * @returns Number of goals that were transitioned to fundraising
 */
export async function closeExpiredVoting(gymId: string): Promise<number> {
  try {
    const now = new Date();

    // Find all voting goals with expired deadlines
    const expiredGoals = await prisma.goal.findMany({
      where: {
        gymId,
        status: "voting",
        votingEndsAt: {
          lt: now,
        },
      },
      select: { id: true },
    });

    let closedCount = 0;

    // Close each expired goal
    for (const goal of expiredGoals) {
      const result = await selectWinner(goal.id);
      if (result.success) {
        closedCount++;
      }
    }

    return closedCount;
  } catch (error) {
    console.error("Error closing expired voting:", error);
    return 0;
  }
}

/**
 * Get a member's current vote for a goal
 *
 * @param goalId - The goal ID
 * @param memberId - The member's ID
 * @returns The option ID they voted for, or null if no vote
 */
export async function getMemberVote(
  goalId: string,
  memberId: string
): Promise<string | null> {
  const vote = await prisma.goalVote.findUnique({
    where: {
      goalId_memberId: {
        goalId,
        memberId,
      },
    },
    select: { optionId: true },
  });

  return vote?.optionId ?? null;
}

/**
 * Get vote breakdown for a goal (all options with counts and percentages)
 *
 * @param goalId - The goal ID
 */
export async function getVoteBreakdown(goalId: string): Promise<{
  totalVotes: number;
  options: Array<{
    id: string;
    name: string;
    voteCount: number;
    percentage: number;
  }>;
}> {
  const options = await prisma.goalOption.findMany({
    where: { goalId },
    orderBy: [{ voteCount: "desc" }, { displayOrder: "asc" }],
    select: {
      id: true,
      name: true,
      voteCount: true,
    },
  });

  const totalVotes = options.reduce((sum, opt) => sum + opt.voteCount, 0);

  return {
    totalVotes,
    options: options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      voteCount: opt.voteCount,
      percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
    })),
  };
}

/**
 * Add a contribution to a goal (for subscription payments or manual entries)
 *
 * @param goalId - The goal ID
 * @param amount - Amount in cents
 * @param source - "subscription" or "manual"
 * @param memberId - Optional member ID for subscription payments
 * @param memberName - Optional member name for display
 * @param note - Optional note
 */
export async function addContribution(
  goalId: string,
  amount: number,
  source: "subscription" | "manual",
  memberId?: string,
  memberName?: string,
  note?: string
): Promise<{ success: boolean; completed?: boolean; error?: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get the goal
      const goal = await tx.goal.findUnique({
        where: { id: goalId },
        include: {
          options: {
            where: { id: { not: undefined } },
          },
        },
      });

      if (!goal) {
        return { success: false, error: "GOAL_NOT_FOUND" };
      }

      if (goal.status !== "fundraising") {
        return { success: false, error: "NOT_IN_FUNDRAISING_STATUS" };
      }

      // Get target amount from winning option
      const winningOption = goal.options.find((o) => o.id === goal.winningOptionId);
      if (!winningOption) {
        return { success: false, error: "WINNING_OPTION_NOT_FOUND" };
      }

      // Create contribution record
      await tx.goalContribution.create({
        data: {
          goalId,
          amount,
          source,
          memberId,
          memberName,
          note,
        },
      });

      // Update goal's current amount
      const newCurrentAmount = goal.currentAmount + amount;
      const isNowCompleted = newCurrentAmount >= winningOption.targetAmount;

      await tx.goal.update({
        where: { id: goalId },
        data: {
          currentAmount: newCurrentAmount,
          status: isNowCompleted ? "completed" : "fundraising",
          completedAt: isNowCompleted ? new Date() : null,
        },
      });

      return { success: true, completed: isNowCompleted };
    });

    return result;
  } catch (error) {
    console.error("Error adding contribution:", error);
    return { success: false, error: "INTERNAL_ERROR" };
  }
}
