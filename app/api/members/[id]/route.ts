import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { calculateDailyTargets, calculateStreak, Goal } from "@/lib/calculations";

// Valid subscription status transitions
const VALID_SUBSCRIPTION_STATUSES = ["trial", "active", "expired", "cancelled"] as const;
type SubscriptionStatus = (typeof VALID_SUBSCRIPTION_STATUSES)[number];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const member = await prisma.member.findUnique({
      where: { id, gymId: session.gymId },
      include: {
        weeklyCheckins: {
          orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
          take: 8,
        },
        aiSummaries: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLogs = await prisma.dailyLog.findMany({
      where: {
        memberId: id,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true, type: true },
    });

    const targets = calculateDailyTargets(
      member.weight || 70,
      member.goal as Goal
    );

    const streak = calculateStreak(recentLogs.map((l) => l.createdAt));

    const activitySummary = {
      totalLogs: recentLogs.length,
      mealLogs: recentLogs.filter((l) => l.type === "meal").length,
      trainingLogs: recentLogs.filter((l) => l.type === "training").length,
      waterLogs: recentLogs.filter((l) => l.type === "water").length,
    };

    const notes = await prisma.staffNote.findMany({
      where: { memberId: id },
      include: { staff: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      member: {
        id: member.id,
        memberId: member.memberId,
        name: member.name,
        goal: member.goal,
        weight: member.weight,
        height: member.height,
        status: member.status,
        subscriptionStatus: member.subscriptionStatus,
        trialEndDate: member.trialEndDate,
        subscriptionEndDate: member.subscriptionEndDate,
        createdAt: member.createdAt,
      },
      targets,
      streak,
      activitySummary,
      weeklyCheckins: member.weeklyCheckins,
      aiSummaries: member.aiSummaries,
      notes,
    });
  } catch (error) {
    console.error("Get member error:", error);
    return NextResponse.json(
      { error: "Failed to get member" },
      { status: 500 }
    );
  }
}

// PATCH /api/members/[id] - Update member (subscription status, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate member exists and belongs to staff's gym
    const member = await prisma.member.findUnique({
      where: { id, gymId: session.gymId },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Build update object based on allowed fields
    const updateData: {
      subscriptionStatus?: SubscriptionStatus;
      subscriptionEndDate?: Date | null;
      goal?: string;
      weight?: number;
      height?: number;
      status?: string;
    } = {};

    // Handle subscription status change
    if (body.subscriptionStatus) {
      if (!VALID_SUBSCRIPTION_STATUSES.includes(body.subscriptionStatus)) {
        return NextResponse.json(
          { error: "Invalid subscription status" },
          { status: 400 }
        );
      }
      updateData.subscriptionStatus = body.subscriptionStatus;

      // Set subscription end date when activating (default 30 days from now)
      if (body.subscriptionStatus === "active" && !member.subscriptionEndDate) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        updateData.subscriptionEndDate = endDate;
      }

      // Allow custom subscription end date
      if (body.subscriptionEndDate) {
        updateData.subscriptionEndDate = new Date(body.subscriptionEndDate);
      }
    }

    // Handle other allowed field updates
    if (body.goal && ["fat_loss", "muscle_gain", "recomposition"].includes(body.goal)) {
      updateData.goal = body.goal;
    }

    if (typeof body.weight === "number" && body.weight > 0) {
      updateData.weight = body.weight;
    }

    if (typeof body.height === "number" && body.height > 0) {
      updateData.height = body.height;
    }

    if (body.status && ["active", "inactive"].includes(body.status)) {
      updateData.status = body.status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updatedMember = await prisma.member.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      member: {
        id: updatedMember.id,
        memberId: updatedMember.memberId,
        name: updatedMember.name,
        subscriptionStatus: updatedMember.subscriptionStatus,
        subscriptionEndDate: updatedMember.subscriptionEndDate,
        goal: updatedMember.goal,
        weight: updatedMember.weight,
        height: updatedMember.height,
        status: updatedMember.status,
      },
    });
  } catch (error) {
    console.error("Update member error:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}
