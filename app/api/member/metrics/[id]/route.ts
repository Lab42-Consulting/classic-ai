import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";

// PATCH - Update a metric (only own metrics, not coach-created)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Find the metric
    const metric = await prisma.customMetric.findUnique({
      where: { id },
    });

    if (!metric) {
      return NextResponse.json(
        { error: "Metrika nije pronađena" },
        { status: 404 }
      );
    }

    // Check ownership
    if (metric.memberId !== authResult.memberId) {
      return NextResponse.json(
        { error: "Nemate pristup ovoj metrici" },
        { status: 403 }
      );
    }

    // Cannot edit coach-created metrics
    if (metric.createdByCoachId) {
      return NextResponse.json(
        { error: "Ne možete izmeniti metriku koju je kreirao trener" },
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
      if (targetValue !== null && typeof targetValue !== "number") {
        return NextResponse.json(
          { error: "Ciljna vrednost mora biti broj" },
          { status: 400 }
        );
      }
      updateData.targetValue = targetValue;
    }

    if (referenceValue !== undefined) {
      if (referenceValue !== null && typeof referenceValue !== "number") {
        return NextResponse.json(
          { error: "Referentna vrednost mora biti broj" },
          { status: 400 }
        );
      }
      updateData.referenceValue = referenceValue;
    }

    if (higherIsBetter !== undefined) {
      updateData.higherIsBetter = !!higherIsBetter;
    }

    // Update the metric
    const updatedMetric = await prisma.customMetric.update({
      where: { id },
      data: updateData,
      include: {
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
        isCoachCreated: false,
        coachName: null,
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

// DELETE - Delete a metric (only own metrics, not coach-created)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Find the metric
    const metric = await prisma.customMetric.findUnique({
      where: { id },
    });

    if (!metric) {
      return NextResponse.json(
        { error: "Metrika nije pronađena" },
        { status: 404 }
      );
    }

    // Check ownership
    if (metric.memberId !== authResult.memberId) {
      return NextResponse.json(
        { error: "Nemate pristup ovoj metrici" },
        { status: 403 }
      );
    }

    // Cannot delete coach-created metrics
    if (metric.createdByCoachId) {
      return NextResponse.json(
        { error: "Ne možete obrisati metriku koju je kreirao trener" },
        { status: 403 }
      );
    }

    // Delete the metric (cascade deletes entries)
    await prisma.customMetric.delete({
      where: { id },
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
