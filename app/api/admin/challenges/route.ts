import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { getChallengeStatus } from "@/lib/challenges";
import { checkFeatureAccess } from "@/lib/subscription/guards";

/**
 * GET /api/admin/challenges
 * List all challenges for the gym
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

    // Check tier access for challenges feature
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

    const challenges = await prisma.challenge.findMany({
      where: { gymId: staff.gymId },
      include: {
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Add computed status to each challenge
    const challengesWithStatus = challenges.map((challenge) => ({
      ...challenge,
      computedStatus: getChallengeStatus(challenge),
      participantCount: challenge._count.participants,
    }));

    return NextResponse.json({ challenges: challengesWithStatus });
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json(
      { error: "Failed to fetch challenges" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/challenges
 * Create a new challenge
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

    // Check tier access for challenges feature
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
      rewardDescription,
      startDate,
      endDate,
      joinDeadlineDays = 7,
      winnerCount = 3,
      pointsPerMeal = 5,
      pointsPerTraining = 15,
      pointsPerWater = 1,
      pointsPerCheckin = 25,
      streakBonus = 5,
      excludeTopN = 3,
      winnerCooldownMonths = 3,
    } = body;

    // Validate required fields
    if (!name || !description || !rewardDescription || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (end <= start) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Check for existing active/registration challenge (one at a time)
    const existingActive = await prisma.challenge.findFirst({
      where: {
        gymId: staff.gymId,
        status: { in: ["draft", "registration", "active"] },
        endDate: { gte: new Date() },
      },
    });

    if (existingActive) {
      return NextResponse.json(
        { error: "Već postoji aktivan izazov. Završite ga pre kreiranja novog." },
        { status: 400 }
      );
    }

    const challenge = await prisma.challenge.create({
      data: {
        gymId: staff.gymId,
        name,
        description,
        rewardDescription,
        startDate: start,
        endDate: end,
        joinDeadlineDays,
        winnerCount,
        pointsPerMeal,
        pointsPerTraining,
        pointsPerWater,
        pointsPerCheckin,
        streakBonus,
        excludeTopN,
        winnerCooldownMonths,
        status: "draft",
      },
    });

    return NextResponse.json({ success: true, challenge });
  } catch (error) {
    console.error("Error creating challenge:", error);
    return NextResponse.json(
      { error: "Failed to create challenge" },
      { status: 500 }
    );
  }
}
