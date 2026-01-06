import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { isValidCancellationReason, MIN_CANCELLATION_REASON_LENGTH } from "@/lib/types/sessions";

// POST /api/coach/sessions/[id]/cancel - Cancel a confirmed session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify this is a coach
    const coach = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true },
    });

    if (!coach || coach.role !== "coach") {
      return NextResponse.json(
        { error: "Samo treneri mogu otkazivati termine" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    // Validate cancellation reason
    if (!reason || !isValidCancellationReason(reason)) {
      return NextResponse.json(
        { error: `Razlog otkazivanja je obavezan (najmanje ${MIN_CANCELLATION_REASON_LENGTH} karaktera)` },
        { status: 400 }
      );
    }

    // Get the session
    const scheduledSession = await prisma.scheduledSession.findFirst({
      where: {
        id,
        staffId: session.userId,
        status: "confirmed",
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!scheduledSession) {
      return NextResponse.json(
        { error: "Termin nije pronađen ili je već otkazan/završen" },
        { status: 404 }
      );
    }

    // Cancel the session
    const cancelledSession = await prisma.scheduledSession.update({
      where: { id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: "coach",
        cancellationReason: reason.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Termin je otkazan",
      session: cancelledSession,
    });
  } catch (error) {
    console.error("Cancel session error:", error);
    return NextResponse.json(
      { error: "Greška pri otkazivanju termina" },
      { status: 500 }
    );
  }
}
