/**
 * Challenge point awarding system
 * Handles awarding points to challenge participants when they log activities
 */

import prisma from "@/lib/db";
import { Prisma, PrismaClient } from "@prisma/client";
import { calculateStreakBonus } from "./index";

export type LogType = "meal" | "training" | "water";

// Pagination defaults for leaderboard queries
const DEFAULT_LEADERBOARD_LIMIT = 50;
const MAX_LEADERBOARD_LIMIT = 200;

// Transaction client type
type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Check if member has a valid gym check-in for today
 * Returns true if:
 * - Gym does NOT require check-in (no checkinSecret)
 * - Gym requires check-in AND member has checked in today
 *
 * @param memberId - The member's ID
 * @param tx - Optional transaction client for atomic operations
 */
async function hasValidGymCheckin(
  memberId: string,
  tx: TransactionClient = prisma
): Promise<boolean> {
  // First, get the member's gym to check if check-in is required
  const member = await tx.member.findUnique({
    where: { id: memberId },
    select: {
      gymId: true,
      gym: {
        select: {
          checkinSecret: true,
        },
      },
    },
  });

  if (!member) {
    return false;
  }

  // If gym doesn't have check-in enabled, no verification needed
  if (!member.gym.checkinSecret) {
    return true;
  }

  // Gym requires check-in, verify member has checked in today
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const checkin = await tx.gymCheckin.findUnique({
    where: {
      memberId_date: {
        memberId,
        date: today,
      },
    },
  });

  return !!checkin;
}

/**
 * Award points to a member for logging an activity (meal, training, or water)
 * Only awards points if member is participating in an active challenge
 *
 * IMPORTANT: Training points require a valid gym check-in for the day
 * (anti-cheating measure - members must be physically at the gym)
 *
 * Uses Serializable isolation to prevent race conditions where concurrent
 * requests could double-award points or incorrectly calculate streaks.
 *
 * @param memberId - The member's ID
 * @param logType - Type of log: meal, training, or water
 * @returns Object indicating if points were awarded and reason if not
 */
export async function awardPointsForLog(
  memberId: string,
  logType: LogType
): Promise<{ awarded: boolean; reason?: string }> {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const now = new Date();

        // Find active challenge participation for this member
        const participation = await tx.challengeParticipant.findFirst({
          where: {
            memberId,
            challenge: {
              status: { in: ["registration", "active"] },
              startDate: { lte: now },
              endDate: { gte: now },
            },
          },
          include: {
            challenge: true,
          },
        });

        // No active participation, nothing to do
        if (!participation) {
          return { awarded: false, reason: "not_participating" } as const;
        }

        const challenge = participation.challenge;

        // Determine points based on log type
        let pointsToAdd = 0;
        let pointField: "mealPoints" | "trainingPoints" | "waterPoints";

        switch (logType) {
          case "meal":
            pointsToAdd = challenge.pointsPerMeal;
            pointField = "mealPoints";
            break;
          case "training":
            // Training requires gym check-in verification (use transaction client)
            const hasCheckin = await hasValidGymCheckin(memberId, tx);
            if (!hasCheckin) {
              // Log training but don't award challenge points
              return { awarded: false, reason: "no_gym_checkin" } as const;
            }
            pointsToAdd = challenge.pointsPerTraining;
            pointField = "trainingPoints";
            break;
          case "water":
            pointsToAdd = challenge.pointsPerWater;
            pointField = "waterPoints";
            break;
        }

        // Calculate streak bonus
        const { newStreak, awardBonus } = calculateStreakBonus(
          participation.lastActiveDate,
          participation.currentStreak
        );

        const streakPointsToAdd = awardBonus ? challenge.streakBonus : 0;

        // Update participant points atomically within transaction
        await tx.challengeParticipant.update({
          where: { id: participation.id },
          data: {
            [pointField]: { increment: pointsToAdd },
            totalPoints: { increment: pointsToAdd + streakPointsToAdd },
            streakPoints: { increment: streakPointsToAdd },
            currentStreak: newStreak,
            lastActiveDate: now,
          },
        });

        return { awarded: true } as const;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 5000, // 5 second timeout to prevent deadlocks
      }
    );

    return result;
  } catch (error) {
    // Log error but don't throw - point awarding should not break logging
    console.error("Error awarding points for log:", error);
    return { awarded: false, reason: "error" };
  }
}

/**
 * Award points to a member for completing a weekly check-in
 * Only awards points if member is participating in an active challenge
 *
 * Uses Serializable isolation to prevent race conditions where concurrent
 * requests could double-award check-in points.
 *
 * @param memberId - The member's ID
 */
export async function awardPointsForCheckin(memberId: string): Promise<void> {
  try {
    await prisma.$transaction(
      async (tx) => {
        const now = new Date();

        // Find active challenge participation for this member
        const participation = await tx.challengeParticipant.findFirst({
          where: {
            memberId,
            challenge: {
              status: { in: ["registration", "active"] },
              startDate: { lte: now },
              endDate: { gte: now },
            },
          },
          include: {
            challenge: true,
          },
        });

        // No active participation, nothing to do
        if (!participation) {
          return;
        }

        const pointsToAdd = participation.challenge.pointsPerCheckin;

        // Update participant points atomically within transaction
        await tx.challengeParticipant.update({
          where: { id: participation.id },
          data: {
            checkinPoints: { increment: pointsToAdd },
            totalPoints: { increment: pointsToAdd },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 5000, // 5 second timeout to prevent deadlocks
      }
    );
  } catch (error) {
    // Log error but don't throw - point awarding should not break check-in
    console.error("Error awarding points for checkin:", error);
  }
}

/**
 * Get leaderboard for a challenge
 * Sorted by total points (desc), then by join date (asc) for tie-breaking
 *
 * @param challengeId - The challenge ID
 * @param limit - Optional limit for number of results (default: 50, max: 200)
 */
export async function getChallengeLeaderboard(
  challengeId: string,
  limit?: number
) {
  // Apply pagination defaults and max limit to prevent unbounded queries
  const effectiveLimit = Math.min(
    limit ?? DEFAULT_LEADERBOARD_LIMIT,
    MAX_LEADERBOARD_LIMIT
  );

  return prisma.challengeParticipant.findMany({
    where: { challengeId },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          memberId: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: [
      { totalPoints: "desc" },
      { joinedAt: "asc" }, // Earlier joiners rank higher on tie
    ],
    take: effectiveLimit,
  });
}

/**
 * Get a member's rank in a challenge
 *
 * @param challengeId - The challenge ID
 * @param memberId - The member's ID
 * @returns The rank (1-indexed) or null if not participating
 */
export async function getMemberRank(
  challengeId: string,
  memberId: string
): Promise<number | null> {
  const participation = await prisma.challengeParticipant.findUnique({
    where: {
      challengeId_memberId: {
        challengeId,
        memberId,
      },
    },
  });

  if (!participation) {
    return null;
  }

  // Count participants with more points or same points but earlier join
  const higherRanked = await prisma.challengeParticipant.count({
    where: {
      challengeId,
      OR: [
        { totalPoints: { gt: participation.totalPoints } },
        {
          AND: [
            { totalPoints: participation.totalPoints },
            { joinedAt: { lt: participation.joinedAt } },
          ],
        },
      ],
    },
  });

  return higherRanked + 1;
}
