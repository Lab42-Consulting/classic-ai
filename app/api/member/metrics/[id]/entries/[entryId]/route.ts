import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";

// DELETE - Delete a specific entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const { id, entryId } = await params;

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

    // Find the entry
    const entry = await prisma.metricEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Unos nije pronađen" },
        { status: 404 }
      );
    }

    // Verify entry belongs to this metric
    if (entry.metricId !== id) {
      return NextResponse.json(
        { error: "Unos ne pripada ovoj metrici" },
        { status: 400 }
      );
    }

    // Delete the entry
    await prisma.metricEntry.delete({
      where: { id: entryId },
    });

    return NextResponse.json({
      success: true,
      message: "Unos je uspešno obrisan",
    });
  } catch (error) {
    console.error("Delete metric entry error:", error);
    return NextResponse.json(
      { error: "Failed to delete metric entry" },
      { status: 500 }
    );
  }
}
