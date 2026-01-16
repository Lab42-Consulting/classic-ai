import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";

// Calculate entry status based on semaphore logic
function getEntryStatus(
  value: number,
  target: number | null,
  reference: number | null,
  higherIsBetter: boolean
): "on_track" | "needs_attention" | "off_track" | "neutral" {
  // No target = neutral (single color)
  if (target === null) {
    return "neutral";
  }

  if (higherIsBetter) {
    // Higher is better: Green if at/above target
    if (value >= target) return "on_track";
    if (value >= target * 0.9) return "needs_attention"; // Within 10%
    return "off_track";
  } else {
    // Lower is better (e.g., body fat %): Green if at/below target
    if (value <= target) return "on_track";
    if (value <= target * 1.1) return "needs_attention"; // Within 10%
    return "off_track";
  }
}

// Calculate change from reference
// For metrics with "%" unit, return absolute change (e.g., -5 meaning dropped 5 percentage points)
// For other metrics, return percentage change (e.g., +20% meaning 20% increase)
function getChangeFromReference(
  value: number,
  reference: number | null,
  unit: string
): { value: number; isAbsolute: boolean } | null {
  if (reference === null || reference === 0) return null;

  // For percentage-based metrics (body fat %, etc.), show absolute change
  if (unit.includes("%")) {
    return { value: value - reference, isAbsolute: true };
  }

  // For other metrics, show percentage change
  return { value: ((value - reference) / reference) * 100, isAbsolute: false };
}

// GET - Get entries for a metric with time range filter
export async function GET(
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
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30"; // Default 30 days

    // Find the metric
    const metric = await prisma.customMetric.findUnique({
      where: { id },
      include: {
        createdByCoach: {
          select: { name: true },
        },
      },
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
        metricId: id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "desc" },
    });

    // Get first entry ever (for reference value if not explicitly set)
    const firstEntry = await prisma.metricEntry.findFirst({
      where: { metricId: id },
      orderBy: { date: "asc" },
    });

    // Determine effective reference value
    const effectiveReference =
      metric.referenceValue ?? firstEntry?.value ?? null;

    // Map entries with status and change
    const mappedEntries = entries.map((entry) => {
      const change = getChangeFromReference(entry.value, effectiveReference, metric.unit);
      return {
        id: entry.id,
        date: entry.date.toISOString().split("T")[0],
        value: entry.value,
        note: entry.note,
        status: getEntryStatus(
          entry.value,
          metric.targetValue,
          effectiveReference,
          metric.higherIsBetter
        ),
        changeFromReference: change?.value ?? null,
        changeIsAbsolute: change?.isAbsolute ?? false,
      };
    });

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

// POST - Create or update an entry for a date
export async function POST(
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

    // Check ownership (member can add entries to both own and coach-created metrics)
    if (metric.memberId !== authResult.memberId) {
      return NextResponse.json(
        { error: "Nemate pristup ovoj metrici" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { date, value, note } = body;

    // Validate required fields
    if (!date || typeof date !== "string") {
      return NextResponse.json(
        { error: "Datum je obavezan" },
        { status: 400 }
      );
    }

    if (value === undefined || value === null || typeof value !== "number") {
      return NextResponse.json(
        { error: "Vrednost je obavezna i mora biti broj" },
        { status: 400 }
      );
    }

    // Parse the date
    const entryDate = new Date(date);
    if (isNaN(entryDate.getTime())) {
      return NextResponse.json(
        { error: "Neispravan format datuma" },
        { status: 400 }
      );
    }

    // Set to start of day for consistent storage
    entryDate.setHours(0, 0, 0, 0);

    // Check if entry exists for this date (upsert)
    const existingEntry = await prisma.metricEntry.findUnique({
      where: {
        metricId_date: {
          metricId: id,
          date: entryDate,
        },
      },
    });

    let entry;
    if (existingEntry) {
      // Update existing entry
      entry = await prisma.metricEntry.update({
        where: { id: existingEntry.id },
        data: {
          value,
          note: note || null,
        },
      });
    } else {
      // Create new entry
      entry = await prisma.metricEntry.create({
        data: {
          metricId: id,
          memberId: authResult.memberId,
          date: entryDate,
          value,
          note: note || null,
        },
      });
    }

    // Get first entry for reference value calculation
    const firstEntry = await prisma.metricEntry.findFirst({
      where: { metricId: id },
      orderBy: { date: "asc" },
    });

    const effectiveReference =
      metric.referenceValue ?? firstEntry?.value ?? null;

    const change = getChangeFromReference(entry.value, effectiveReference, metric.unit);

    return NextResponse.json({
      success: true,
      entry: {
        id: entry.id,
        date: entry.date.toISOString().split("T")[0],
        value: entry.value,
        note: entry.note,
        status: getEntryStatus(
          entry.value,
          metric.targetValue,
          effectiveReference,
          metric.higherIsBetter
        ),
        changeFromReference: change?.value ?? null,
        changeIsAbsolute: change?.isAbsolute ?? false,
      },
      isUpdate: !!existingEntry,
    });
  } catch (error) {
    console.error("Create/update metric entry error:", error);
    return NextResponse.json(
      { error: "Failed to save metric entry" },
      { status: 500 }
    );
  }
}
