import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";
import { getChallengeStatus, canJoinChallenge, getDaysUntilJoinDeadline, getDaysUntilEnd, getDaysUntilStart } from "@/lib/challenges";
import { getChallengeLeaderboard, getMemberRank } from "@/lib/challenges/points";

/**
 * GET /api/member/challenge
 * Get the active challenge for the member's gym, their participation status, and leaderboard
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

    const now = new Date();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Find active, registration, or upcoming challenge for this gym
    // Status must be "registration" or "active" (not "draft" - those are admin-only)
    // We don't filter by startDate to include upcoming challenges
    const challenge = await prisma.challenge.findFirst({
      where: {
        gymId: member.gymId,
        status: { in: ["registration", "active"] },
        endDate: { gte: now },
      },
    });

    // Check if gym has check-in enabled and if member checked in today
    const gym = await prisma.gym.findUnique({
      where: { id: member.gymId },
      select: { checkinSecret: true },
    });

    const gymCheckin = await prisma.gymCheckin.findUnique({
      where: {
        memberId_date: {
          memberId: authResult.memberId,
          date: today,
        },
      },
    });

    const gymCheckinRequired = !!gym?.checkinSecret;
    const checkedInToday = !!gymCheckin;

    if (!challenge) {
      return NextResponse.json({
        challenge: null,
        participation: null,
        leaderboard: [],
        rank: null,
        gymCheckinRequired,
        checkedInToday,
      });
    }

    // Check if member is participating
    const participation = await prisma.challengeParticipant.findUnique({
      where: {
        challengeId_memberId: {
          challengeId: challenge.id,
          memberId: authResult.memberId,
        },
      },
    });

    // Get leaderboard
    const leaderboard = await getChallengeLeaderboard(challenge.id);

    // Get member's rank if participating
    const rank = participation ? await getMemberRank(challenge.id, authResult.memberId) : null;

    const computedStatus = getChallengeStatus(challenge);
    const canJoin = canJoinChallenge(challenge);
    const daysUntilDeadline = getDaysUntilJoinDeadline(challenge);
    const daysUntilEnd = getDaysUntilEnd(challenge);
    const daysUntilStart = getDaysUntilStart(challenge);

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        name: challenge.name,
        description: challenge.description,
        rewardDescription: challenge.rewardDescription,
        startDate: challenge.startDate,
        endDate: challenge.endDate,
        joinDeadlineDays: challenge.joinDeadlineDays,
        winnerCount: challenge.winnerCount,
        status: computedStatus,
        canJoin,
        daysUntilDeadline,
        daysUntilEnd,
        daysUntilStart,
        participantCount: leaderboard.length,
        pointsPerMeal: challenge.pointsPerMeal,
        pointsPerTraining: challenge.pointsPerTraining,
        pointsPerWater: challenge.pointsPerWater,
        pointsPerCheckin: challenge.pointsPerCheckin,
        streakBonus: challenge.streakBonus,
      },
      participation: participation
        ? {
            totalPoints: participation.totalPoints,
            mealPoints: participation.mealPoints,
            trainingPoints: participation.trainingPoints,
            waterPoints: participation.waterPoints,
            checkinPoints: participation.checkinPoints,
            streakPoints: participation.streakPoints,
            currentStreak: participation.currentStreak,
            joinedAt: participation.joinedAt,
          }
        : null,
      rank,
      leaderboard: leaderboard.map((p, index) => ({
        rank: index + 1,
        memberId: p.member.id,
        name: p.member.name,
        avatarUrl: p.member.avatarUrl,
        totalPoints: p.totalPoints,
        isCurrentMember: p.member.id === authResult.memberId,
      })),
      isStaffMember: authResult.isStaffMember || false,
      gymCheckinRequired,
      checkedInToday,
    });
  } catch (error) {
    console.error("Error fetching challenge:", error);
    return NextResponse.json(
      { error: "Failed to fetch challenge" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/member/challenge
 * Join the active challenge
 */
export async function POST() {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    // Coaches cannot participate in challenges
    if (authResult.isStaffMember) {
      return NextResponse.json(
        { error: "Treneri ne mogu učestvovati u izazovima" },
        { status: 403 }
      );
    }

    const member = await prisma.member.findUnique({
      where: { id: authResult.memberId },
      select: { gymId: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const now = new Date();

    // Find active or registration challenge for this gym
    const challenge = await prisma.challenge.findFirst({
      where: {
        gymId: member.gymId,
        status: { in: ["draft", "registration", "active"] },
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Nema aktivnog izazova" },
        { status: 404 }
      );
    }

    // Check if can join
    if (!canJoinChallenge(challenge)) {
      return NextResponse.json(
        { error: "Rok za prijavu je istekao" },
        { status: 400 }
      );
    }

    // Check if already participating
    const existingParticipation = await prisma.challengeParticipant.findUnique({
      where: {
        challengeId_memberId: {
          challengeId: challenge.id,
          memberId: authResult.memberId,
        },
      },
    });

    if (existingParticipation) {
      return NextResponse.json(
        { error: "Već učestvuješ u ovom izazovu" },
        { status: 400 }
      );
    }

    // Create participation
    const participation = await prisma.challengeParticipant.create({
      data: {
        challengeId: challenge.id,
        memberId: authResult.memberId,
      },
    });

    return NextResponse.json({
      success: true,
      participation: {
        id: participation.id,
        joinedAt: participation.joinedAt,
      },
    });
  } catch (error) {
    console.error("Error joining challenge:", error);
    return NextResponse.json(
      { error: "Failed to join challenge" },
      { status: 500 }
    );
  }
}
