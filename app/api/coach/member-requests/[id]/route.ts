import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

// POST - Coach accepts or declines member request
// NOTE: Accepting a member request is just acknowledging the meeting invitation.
// The coach should then meet the member in person and later send a coach-initiated
// request with a plan using the existing /api/coach/request endpoint.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: requestId } = await params;
    const body = await request.json();
    const { action } = body;

    // Validate action
    if (!action || !["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept' or 'decline'" },
        { status: 400 }
      );
    }

    // Get the request and verify it belongs to this coach
    const coachRequest = await prisma.coachRequest.findUnique({
      where: { id: requestId },
      include: {
        member: {
          select: { id: true, name: true, goal: true },
        },
        staff: {
          select: { id: true, role: true },
        },
      },
    });

    if (!coachRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    if (coachRequest.staffId !== session.userId) {
      return NextResponse.json(
        { error: "This request is not for you" },
        { status: 403 }
      );
    }

    if (coachRequest.initiatedBy !== "member") {
      return NextResponse.json(
        { error: "This is not a member-initiated request" },
        { status: 400 }
      );
    }

    // Both accept and decline just delete the request
    // Accept = "I'll meet with you" (meeting invitation acknowledged)
    // Decline = "I can't take you on right now"
    // After meeting, coach uses /api/coach/request to send a plan and formally add the member
    await prisma.coachRequest.delete({
      where: { id: requestId },
    });

    return NextResponse.json({
      success: true,
      message: action === "accept"
        ? "Zahtev prihvaćen - dogovorite sastanak sa članom"
        : "Zahtev odbijen",
      memberName: coachRequest.member.name,
      memberPhone: coachRequest.memberPhone,
    });
  } catch (error) {
    console.error("Handle member request error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
