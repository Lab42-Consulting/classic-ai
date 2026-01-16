import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

// PATCH - Update a coach-created metric
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; metricId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId, metricId } = await params;

    // Get staff info to check role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!staff || staff.role.toLowerCase() !== "coach") {
      return NextResponse.json({ error: "Only coaches can update metrics" }, { status: 403 });
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

    // Find the metric
    const metric = await prisma.customMetric.findUnique({
      where: { id: metricId },
    });

    if (!metric) {
      return NextResponse.json(
        { error: "Metrika nije pronađena" },
        { status: 404 }
      );
    }

    // Verify metric belongs to this member
    if (metric.memberId !== memberId) {
      return NextResponse.json(
        { error: "Metrika ne pripada ovom članu" },
        { status: 400 }
      );
    }

    // Verify coach created this metric
    if (metric.createdByCoachId !== session.userId) {
      return NextResponse.json(
        { error: "Možete izmeniti samo metrike koje ste vi kreirali" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, unit, targetValue, referenceValue, higherIsBetter } = body;

    // Build update data
    const updateData: {
      name?: string;
      unit?: string;
      targetValue?: number | null;
      referenceValue?: number | null;
      higherIsBetter?: boolean;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Naziv metrike ne može biti prazan" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (unit !== undefined) {
      if (typeof unit !== "string" || unit.trim().length === 0) {
        return NextResponse.json(
          { error: "Jedinica mere ne može biti prazna" },
          { status: 400 }
        );
      }
      updateData.unit = unit.trim();
    }

    if (targetValue !== undefined) {
      updateData.targetValue = targetValue;
    }

    if (referenceValue !== undefined) {
      updateData.referenceValue = referenceValue;
    }

    if (higherIsBetter !== undefined) {
      updateData.higherIsBetter = !!higherIsBetter;
    }

    // Update the metric
    const updatedMetric = await prisma.customMetric.update({
      where: { id: metricId },
      data: updateData,
      include: {
        createdByCoach: {
          select: { name: true },
        },
        _count: {
          select: { entries: true },
        },
        entries: {
          orderBy: { date: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      metric: {
        id: updatedMetric.id,
        name: updatedMetric.name,
        unit: updatedMetric.unit,
        targetValue: updatedMetric.targetValue,
        referenceValue: updatedMetric.referenceValue,
        higherIsBetter: updatedMetric.higherIsBetter,
        isCoachCreated: true,
        coachName: updatedMetric.createdByCoach?.name || null,
        entryCount: updatedMetric._count.entries,
        latestEntry: updatedMetric.entries[0]
          ? {
              value: updatedMetric.entries[0].value,
              date: updatedMetric.entries[0].date.toISOString().split("T")[0],
            }
          : null,
        createdAt: updatedMetric.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Update metric error:", error);
    return NextResponse.json(
      { error: "Failed to update metric" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a coach-created metric
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; metricId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId, metricId } = await params;

    // Get staff info to check role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!staff || staff.role.toLowerCase() !== "coach") {
      return NextResponse.json({ error: "Only coaches can delete metrics" }, { status: 403 });
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

    // Find the metric
    const metric = await prisma.customMetric.findUnique({
      where: { id: metricId },
    });

    if (!metric) {
      return NextResponse.json(
        { error: "Metrika nije pronađena" },
        { status: 404 }
      );
    }

    // Verify metric belongs to this member
    if (metric.memberId !== memberId) {
      return NextResponse.json(
        { error: "Metrika ne pripada ovom članu" },
        { status: 400 }
      );
    }

    // Verify coach created this metric
    if (metric.createdByCoachId !== session.userId) {
      return NextResponse.json(
        { error: "Možete obrisati samo metrike koje ste vi kreirali" },
        { status: 403 }
      );
    }

    // Delete the metric (cascade deletes entries)
    await prisma.customMetric.delete({
      where: { id: metricId },
    });

    return NextResponse.json({
      success: true,
      message: "Metrika je uspešno obrisana",
    });
  } catch (error) {
    console.error("Delete metric error:", error);
    return NextResponse.json(
      { error: "Failed to delete metric" },
      { status: 500 }
    );
  }
}

// GET - Get metric entries (for coach to view)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; metricId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId, metricId } = await params;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30";

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

    // Find the metric
    const metric = await prisma.customMetric.findUnique({
      where: { id: metricId },
      include: {
        createdByCoach: {
          select: { name: true },
        },
      },
    });

    if (!metric || metric.memberId !== memberId) {
      return NextResponse.json(
        { error: "Metrika nije pronađena" },
        { status: 404 }
      );
    }

    // Calculate date range
    const days = parseInt(range, 10) || 30;
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Fetch entries within range
    const entries = await prisma.metricEntry.findMany({
      where: {
        metricId: metricId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "desc" },
    });

    // Get first entry ever (for reference value)
    const firstEntry = await prisma.metricEntry.findFirst({
      where: { metricId: metricId },
      orderBy: { date: "asc" },
    });

    // Determine effective reference value
    const effectiveReference =
      metric.referenceValue ?? firstEntry?.value ?? null;

    // Status calculation function
    const getEntryStatus = (
      value: number,
      target: number | null,
      higherIsBetter: boolean
    ): "on_track" | "needs_attention" | "off_track" | "neutral" => {
      if (target === null) return "neutral";
      if (higherIsBetter) {
        if (value >= target) return "on_track";
        if (value >= target * 0.9) return "needs_attention";
        return "off_track";
      } else {
        if (value <= target) return "on_track";
        if (value <= target * 1.1) return "needs_attention";
        return "off_track";
      }
    };

    // Map entries
    const mappedEntries = entries.map((entry) => ({
      id: entry.id,
      date: entry.date.toISOString().split("T")[0],
      value: entry.value,
      note: entry.note,
      status: getEntryStatus(entry.value, metric.targetValue, metric.higherIsBetter),
      changeFromReference:
        effectiveReference && effectiveReference !== 0
          ? ((entry.value - effectiveReference) / effectiveReference) * 100
          : null,
    }));

    return NextResponse.json({
      metric: {
        id: metric.id,
        name: metric.name,
        unit: metric.unit,
        targetValue: metric.targetValue,
        referenceValue: effectiveReference,
        higherIsBetter: metric.higherIsBetter,
        isCoachCreated: !!metric.createdByCoachId,
        coachName: metric.createdByCoach?.name || null,
      },
      entries: mappedEntries,
      range: days,
    });
  } catch (error) {
    console.error("Get metric entries error:", error);
    return NextResponse.json(
      { error: "Failed to get metric entries" },
      { status: 500 }
    );
  }
}
