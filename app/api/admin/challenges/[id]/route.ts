import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { getChallengeStatus } from "@/lib/challenges";
import { getChallengeLeaderboard } from "@/lib/challenges/points";

/**
 * GET /api/admin/challenges/[id]
 * Get challenge details with leaderboard
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    if (challenge.gymId !== staff.gymId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get leaderboard
    const leaderboard = await getChallengeLeaderboard(id);

    return NextResponse.json({
      challenge: {
        ...challenge,
        computedStatus: getChallengeStatus(challenge),
        participantCount: challenge._count.participants,
      },
      leaderboard,
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
 * PATCH /api/admin/challenges/[id]
 * Update challenge (only if draft or registration)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const challenge = await prisma.challenge.findUnique({
      where: { id },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    if (challenge.gymId !== staff.gymId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const computedStatus = getChallengeStatus(challenge);

    // Check if action is to publish the challenge
    if (body.action === "publish") {
      if (computedStatus !== "draft") {
        return NextResponse.json(
          { error: "Only draft challenges can be published" },
          { status: 400 }
        );
      }

      // Set status to "registration" - the computedStatus will then be
      // "upcoming" if start date is in future, or "registration" if already started
      const updated = await prisma.challenge.update({
        where: { id },
        data: { status: "registration" },
      });

      return NextResponse.json({
        success: true,
        challenge: {
          ...updated,
          computedStatus: getChallengeStatus(updated),
        },
      });
    }

    // Check if action is to end the challenge
    if (body.action === "end") {
      if (computedStatus === "ended") {
        return NextResponse.json(
          { error: "Challenge is already ended" },
          { status: 400 }
        );
      }

      const updated = await prisma.challenge.update({
        where: { id },
        data: { status: "ended" },
      });

      return NextResponse.json({ success: true, challenge: updated });
    }

    // Regular update - only allowed for draft or registration status
    if (computedStatus !== "draft" && computedStatus !== "registration") {
      return NextResponse.json(
        { error: "Cannot edit challenge after registration period" },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      rewardDescription,
      startDate,
      endDate,
      joinDeadlineDays,
      winnerCount,
      pointsPerMeal,
      pointsPerTraining,
      pointsPerWater,
      pointsPerCheckin,
      streakBonus,
    } = body;

    // Build update data (only include provided fields)
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (rewardDescription !== undefined) updateData.rewardDescription = rewardDescription;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (joinDeadlineDays !== undefined) updateData.joinDeadlineDays = joinDeadlineDays;
    if (winnerCount !== undefined) updateData.winnerCount = winnerCount;
    if (pointsPerMeal !== undefined) updateData.pointsPerMeal = pointsPerMeal;
    if (pointsPerTraining !== undefined) updateData.pointsPerTraining = pointsPerTraining;
    if (pointsPerWater !== undefined) updateData.pointsPerWater = pointsPerWater;
    if (pointsPerCheckin !== undefined) updateData.pointsPerCheckin = pointsPerCheckin;
    if (streakBonus !== undefined) updateData.streakBonus = streakBonus;

    const updated = await prisma.challenge.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      challenge: {
        ...updated,
        computedStatus: getChallengeStatus(updated),
      },
    });
  } catch (error) {
    console.error("Error updating challenge:", error);
    return NextResponse.json(
      { error: "Failed to update challenge" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/challenges/[id]
 * Delete challenge (only if draft and no participants)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    if (challenge.gymId !== staff.gymId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const computedStatus = getChallengeStatus(challenge);

    // Only allow deleting drafts with no participants
    if (computedStatus !== "draft") {
      return NextResponse.json(
        { error: "Only draft challenges can be deleted" },
        { status: 400 }
      );
    }

    if (challenge._count.participants > 0) {
      return NextResponse.json(
        { error: "Cannot delete challenge with participants" },
        { status: 400 }
      );
    }

    await prisma.challenge.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting challenge:", error);
    return NextResponse.json(
      { error: "Failed to delete challenge" },
      { status: 500 }
    );
  }
}
