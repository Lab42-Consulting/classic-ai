import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";
import { isValidCancellationReason, MIN_CANCELLATION_REASON_LENGTH } from "@/lib/types/sessions";

// POST /api/member/sessions/[id]/cancel - Cancel a confirmed session
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
    const session = await prisma.scheduledSession.findFirst({
      where: {
        id,
        memberId: authResult.memberId,
        status: "confirmed",
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!session) {
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
        cancelledBy: "member",
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
