import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

// GET - Get all metrics for a member (coach view)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId } = await params;

    // Get staff info to check role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!staff || staff.role.toLowerCase() !== "coach") {
      return NextResponse.json({ error: "Only coaches can access this" }, { status: 403 });
    }

    // Verify coach is assigned to this member
    const assignment = await prisma.coachAssignment.findFirst({
      where: {
        staffId: session.userId,
        memberId: memberId,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this member" },
        { status: 403 }
      );
    }

    // Get all metrics for this member (both member-created and coach-created)
    const metrics = await prisma.customMetric.findMany({
      where: {
        memberId: memberId,
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

    // Separate own (coach-created) and member-created metrics
    const coachMetrics = metrics.filter((m) => m.createdByCoachId === session.userId);
    const memberMetrics = metrics.filter((m) => !m.createdByCoachId);

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
      coachCreated: coachMetrics.map(mapMetric),
      memberCreated: memberMetrics.map(mapMetric),
    });
  } catch (error) {
    console.error("Get member metrics error:", error);
    return NextResponse.json(
      { error: "Failed to get metrics" },
      { status: 500 }
    );
  }
}

// POST - Create a new metric for a member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId } = await params;

    // Get staff info to check role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, name: true },
    });

    if (!staff || staff.role.toLowerCase() !== "coach") {
      return NextResponse.json({ error: "Only coaches can create metrics" }, { status: 403 });
    }

    // Verify coach is assigned to this member
    const assignment = await prisma.coachAssignment.findFirst({
      where: {
        staffId: session.userId,
        memberId: memberId,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this member" },
        { status: 403 }
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

    // Create the metric
    const metric = await prisma.customMetric.create({
      data: {
        memberId: memberId,
        createdByCoachId: session.userId,
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
        isCoachCreated: true,
        coachName: staff.name,
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
