import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * GET /api/admin/fundraising-goals/[id]
 * Get a single fundraising goal with contributions
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

    const { id } = await params;

    // Verify admin role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const goal = await prisma.fundraisingGoal.findUnique({
      where: { id },
      include: {
        contributions: {
          orderBy: { createdAt: "desc" },
          take: 50, // Last 50 contributions
        },
        _count: {
          select: { contributions: true },
        },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: "Cilj nije pronađen" }, { status: 404 });
    }

    if (goal.gymId !== staff.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({
      goal: {
        ...goal,
        targetAmount: goal.targetAmount / 100,
        currentAmount: goal.currentAmount / 100,
        progressPercentage: Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)),
        contributionCount: goal._count.contributions,
        contributions: goal.contributions.map((c) => ({
          ...c,
          amount: c.amount / 100,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching fundraising goal:", error);
    return NextResponse.json(
      { error: "Failed to fetch fundraising goal" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/fundraising-goals/[id]
 * Update a fundraising goal
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

    const { id } = await params;

    // Verify admin role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get existing goal
    const existingGoal = await prisma.fundraisingGoal.findUnique({
      where: { id },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: "Cilj nije pronađen" }, { status: 404 });
    }

    if (existingGoal.gymId !== staff.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      targetAmount,
      imageUrl,
      isVisible,
      status,
      endDate,
      // For manual amount adjustment
      addAmount,
      addNote,
    } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (targetAmount !== undefined) updateData.targetAmount = Math.round(targetAmount * 100);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (isVisible !== undefined) updateData.isVisible = isVisible;
    if (status !== undefined) {
      updateData.status = status;
      if (status === "completed" && !existingGoal.completedAt) {
        updateData.completedAt = new Date();
      }
    }
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

    // Handle manual amount addition
    if (addAmount && addAmount > 0) {
      const amountInCents = Math.round(addAmount * 100);
      const newCurrentAmount = existingGoal.currentAmount + amountInCents;

      // Create contribution record
      await prisma.fundraisingContribution.create({
        data: {
          fundraisingGoalId: id,
          amount: amountInCents,
          source: "manual",
          note: addNote || "Ručni unos",
        },
      });

      updateData.currentAmount = newCurrentAmount;

      // Check if goal is now completed
      const targetInCents = targetAmount !== undefined
        ? Math.round(targetAmount * 100)
        : existingGoal.targetAmount;

      if (newCurrentAmount >= targetInCents && existingGoal.status === "active") {
        updateData.status = "completed";
        updateData.completedAt = new Date();
      }
    }

    const goal = await prisma.fundraisingGoal.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      goal: {
        ...goal,
        targetAmount: goal.targetAmount / 100,
        currentAmount: goal.currentAmount / 100,
        progressPercentage: Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)),
      },
    });
  } catch (error) {
    console.error("Error updating fundraising goal:", error);
    return NextResponse.json(
      { error: "Failed to update fundraising goal" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/fundraising-goals/[id]
 * Delete a fundraising goal
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

    const { id } = await params;

    // Verify admin role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get existing goal
    const existingGoal = await prisma.fundraisingGoal.findUnique({
      where: { id },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: "Cilj nije pronađen" }, { status: 404 });
    }

    if (existingGoal.gymId !== staff.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.fundraisingGoal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting fundraising goal:", error);
    return NextResponse.json(
      { error: "Failed to delete fundraising goal" },
      { status: 500 }
    );
  }
}
