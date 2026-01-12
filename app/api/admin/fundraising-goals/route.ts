import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { checkFeatureAccess } from "@/lib/subscription/guards";

/**
 * GET /api/admin/fundraising-goals
 * List all fundraising goals for the gym
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

    // Check tier access (Pro feature)
    const featureCheck = await checkFeatureAccess(staff.gymId, "challenges"); // Reuse challenges feature gate
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

    const goals = await prisma.fundraisingGoal.findMany({
      where: { gymId: staff.gymId },
      include: {
        _count: {
          select: { contributions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate progress percentage for each goal
    const goalsWithProgress = goals.map((goal) => ({
      ...goal,
      progressPercentage: Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)),
      contributionCount: goal._count.contributions,
    }));

    return NextResponse.json({ goals: goalsWithProgress });
  } catch (error) {
    console.error("Error fetching fundraising goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch fundraising goals" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/fundraising-goals
 * Create a new fundraising goal
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
    const {
      name,
      description,
      targetAmount, // In euros (will convert to cents)
      imageUrl,
      isVisible = true,
      endDate,
    } = body;

    // Validate required fields
    if (!name || !targetAmount) {
      return NextResponse.json(
        { error: "Naziv i ciljni iznos su obavezni" },
        { status: 400 }
      );
    }

    if (targetAmount <= 0) {
      return NextResponse.json(
        { error: "Ciljni iznos mora biti veći od 0" },
        { status: 400 }
      );
    }

    const goal = await prisma.fundraisingGoal.create({
      data: {
        gymId: staff.gymId,
        name,
        description,
        targetAmount: Math.round(targetAmount * 100), // Convert € to cents
        imageUrl,
        isVisible,
        endDate: endDate ? new Date(endDate) : null,
        status: "active",
      },
    });

    return NextResponse.json({
      success: true,
      goal: {
        ...goal,
        targetAmount: goal.targetAmount / 100, // Return in euros
        currentAmount: goal.currentAmount / 100,
        progressPercentage: 0,
      },
    });
  } catch (error) {
    console.error("Error creating fundraising goal:", error);
    return NextResponse.json(
      { error: "Failed to create fundraising goal" },
      { status: 500 }
    );
  }
}
