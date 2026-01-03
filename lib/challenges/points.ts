/**
 * Challenge point awarding system
 * Handles awarding points to challenge participants when they log activities
 */

import prisma from "@/lib/db";
import { calculateStreakBonus } from "./index";

export type LogType = "meal" | "training" | "water";

/**
 * Award points to a member for logging an activity (meal, training, or water)
 * Only awards points if member is participating in an active challenge
 *
 * @param memberId - The member's ID
 * @param logType - Type of log: meal, training, or water
 */
export async function awardPointsForLog(
  memberId: string,
  logType: LogType
): Promise<void> {
  try {
    const now = new Date();

    // Find active challenge participation for this member
    const participation = await prisma.challengeParticipant.findFirst({
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

    // Update participant points
    await prisma.challengeParticipant.update({
      where: { id: participation.id },
      data: {
        [pointField]: { increment: pointsToAdd },
        totalPoints: { increment: pointsToAdd + streakPointsToAdd },
        streakPoints: { increment: streakPointsToAdd },
        currentStreak: newStreak,
        lastActiveDate: now,
      },
    });
  } catch (error) {
    // Log error but don't throw - point awarding should not break logging
    console.error("Error awarding points for log:", error);
  }
}

/**
 * Award points to a member for completing a weekly check-in
 * Only awards points if member is participating in an active challenge
 *
 * @param memberId - The member's ID
 */
export async function awardPointsForCheckin(memberId: string): Promise<void> {
  try {
    const now = new Date();

    // Find active challenge participation for this member
    const participation = await prisma.challengeParticipant.findFirst({
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

    // Update participant points
    await prisma.challengeParticipant.update({
      where: { id: participation.id },
      data: {
        checkinPoints: { increment: pointsToAdd },
        totalPoints: { increment: pointsToAdd },
      },
    });
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
 * @param limit - Optional limit for number of results
 */
export async function getChallengeLeaderboard(
  challengeId: string,
  limit?: number
) {
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
    take: limit,
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
