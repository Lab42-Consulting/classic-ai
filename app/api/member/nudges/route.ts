import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";

// GET - Get nudges for the logged-in member
export async function GET() {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const nudges = await prisma.coachNudge.findMany({
      where: {
        memberId: authResult.memberId,
      },
      select: {
        id: true,
        message: true,
        createdAt: true,
        seenAt: true,
        staff: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Count unseen nudges
    const unseenCount = nudges.filter(n => !n.seenAt).length;

    return NextResponse.json({
      nudges: nudges.map(n => ({
        id: n.id,
        message: n.message,
        coachName: n.staff.name,
        createdAt: n.createdAt,
        seen: !!n.seenAt,
      })),
      unseenCount,
    });
  } catch (error) {
    console.error("Get member nudges error:", error);
    return NextResponse.json(
      { error: "Failed to get nudges" },
      { status: 500 }
    );
  }
}

// PATCH - Mark nudges as seen
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nudgeIds } = body;

    if (!nudgeIds || !Array.isArray(nudgeIds)) {
      return NextResponse.json(
        { error: "Nudge IDs array is required" },
        { status: 400 }
      );
    }

    // Mark nudges as seen (only if they belong to this member)
    await prisma.coachNudge.updateMany({
      where: {
        id: { in: nudgeIds },
        memberId: authResult.memberId,
        seenAt: null,
      },
      data: {
        seenAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark nudges seen error:", error);
    return NextResponse.json(
      { error: "Failed to mark nudges as seen" },
      { status: 500 }
    );
  }
}
