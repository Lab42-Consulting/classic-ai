import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";

// GET - Get all metrics for the logged-in member (own + coach-created)
export async function GET(request: NextRequest) {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    // Fetch all metrics for this member (both own and coach-created)
    const metrics = await prisma.customMetric.findMany({
      where: {
        memberId: authResult.memberId,
      },
      include: {
        createdByCoach: {
          select: { name: true },
        },
        entries: {
          orderBy: { date: "desc" },
          take: 1, // Only get the latest entry for summary
        },
        _count: {
          select: { entries: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Separate own and coach-created metrics
    const ownMetrics = metrics.filter((m) => !m.createdByCoachId);
    const coachMetrics = metrics.filter((m) => m.createdByCoachId);

    const mapMetric = (metric: typeof metrics[0]) => ({
      id: metric.id,
      name: metric.name,
      unit: metric.unit,
      targetValue: metric.targetValue,
      referenceValue: metric.referenceValue,
      higherIsBetter: metric.higherIsBetter,
      isCoachCreated: !!metric.createdByCoachId,
      coachName: metric.createdByCoach?.name || null,
      entryCount: metric._count.entries,
      latestEntry: metric.entries[0]
        ? {
            value: metric.entries[0].value,
            date: metric.entries[0].date.toISOString().split("T")[0],
          }
        : null,
      createdAt: metric.createdAt.toISOString(),
    });

    return NextResponse.json({
      own: ownMetrics.map(mapMetric),
      coach: coachMetrics.map(mapMetric),
    });
  } catch (error) {
    console.error("Get metrics error:", error);
    return NextResponse.json(
      { error: "Failed to get metrics" },
      { status: 500 }
    );
  }
}

// POST - Create a new metric
export async function POST(request: NextRequest) {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, unit, targetValue, referenceValue, higherIsBetter } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Naziv metrike je obavezan" },
        { status: 400 }
      );
    }

    if (!unit || typeof unit !== "string" || unit.trim().length === 0) {
      return NextResponse.json(
        { error: "Jedinica mere je obavezna" },
        { status: 400 }
      );
    }

    // Validate target and reference values if provided
    if (targetValue !== undefined && targetValue !== null && typeof targetValue !== "number") {
      return NextResponse.json(
        { error: "Ciljna vrednost mora biti broj" },
        { status: 400 }
      );
    }

    if (referenceValue !== undefined && referenceValue !== null && typeof referenceValue !== "number") {
      return NextResponse.json(
        { error: "Referentna vrednost mora biti broj" },
        { status: 400 }
      );
    }

    // Create the metric
    const metric = await prisma.customMetric.create({
      data: {
        memberId: authResult.memberId,
        name: name.trim(),
        unit: unit.trim(),
        targetValue: targetValue ?? null,
        referenceValue: referenceValue ?? null,
        higherIsBetter: higherIsBetter ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      metric: {
        id: metric.id,
        name: metric.name,
        unit: metric.unit,
        targetValue: metric.targetValue,
        referenceValue: metric.referenceValue,
        higherIsBetter: metric.higherIsBetter,
        isCoachCreated: false,
        coachName: null,
        entryCount: 0,
        latestEntry: null,
        createdAt: metric.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create metric error:", error);
    return NextResponse.json(
      { error: "Failed to create metric" },
      { status: 500 }
    );
  }
}
