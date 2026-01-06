import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/coach/sessions/[id]/complete - Mark a session as completed
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
        { error: "Samo treneri mogu označiti termine kao završene" },
        { status: 403 }
      );
    }

    const { id } = await params;

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
        { error: "Termin nije pronađen ili je već završen/otkazan" },
        { status: 404 }
      );
    }

    // Mark as completed
    const completedSession = await prisma.scheduledSession.update({
      where: { id },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Termin je označen kao završen",
      session: completedSession,
    });
  } catch (error) {
    console.error("Complete session error:", error);
    return NextResponse.json(
      { error: "Greška pri označavanju termina kao završenog" },
      { status: 500 }
    );
  }
}
