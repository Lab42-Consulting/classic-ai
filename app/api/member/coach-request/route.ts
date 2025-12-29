import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/member/coach-request - Get pending coach request for current member
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const coachRequest = await prisma.coachRequest.findUnique({
      where: { memberId: session.userId },
      include: {
        staff: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!coachRequest) {
      return NextResponse.json({ request: null });
    }

    return NextResponse.json({
      request: {
        id: coachRequest.id,
        coachName: coachRequest.staff.name,
        customGoal: coachRequest.customGoal,
        customCalories: coachRequest.customCalories,
        customProtein: coachRequest.customProtein,
        customCarbs: coachRequest.customCarbs,
        customFats: coachRequest.customFats,
        notes: coachRequest.notes,
        requireExactMacros: coachRequest.requireExactMacros,
        createdAt: coachRequest.createdAt,
      },
    });
  } catch (error) {
    console.error("Get coach request error:", error);
    return NextResponse.json(
      { error: "Failed to get coach request" },
      { status: 500 }
    );
  }
}

// POST /api/member/coach-request - Accept or decline coach request
// Body: { action: "accept" | "decline" }
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (!action || (action !== "accept" && action !== "decline")) {
      return NextResponse.json(
        { error: "Invalid action. Use 'accept' or 'decline'" },
        { status: 400 }
      );
    }

    // Get the pending request
    const coachRequest = await prisma.coachRequest.findUnique({
      where: { memberId: session.userId },
      include: {
        staff: {
          select: { name: true },
        },
      },
    });

    if (!coachRequest) {
      return NextResponse.json(
        { error: "No pending coach request found" },
        { status: 404 }
      );
    }

    if (action === "decline") {
      // Simply delete the request - coach can send another later
      await prisma.coachRequest.delete({
        where: { id: coachRequest.id },
      });

      return NextResponse.json({
        success: true,
        action: "declined",
        message: "Coach request declined",
      });
    }

    // action === "accept"
    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Delete the pending request
      await tx.coachRequest.delete({
        where: { id: coachRequest.id },
      });

      // 2. Create the coach assignment
      await tx.coachAssignment.create({
        data: {
          staffId: coachRequest.staffId,
          memberId: coachRequest.memberId,
          customGoal: coachRequest.customGoal,
          customCalories: coachRequest.customCalories,
          customProtein: coachRequest.customProtein,
          customCarbs: coachRequest.customCarbs,
          customFats: coachRequest.customFats,
          notes: coachRequest.notes,
          requireExactMacros: coachRequest.requireExactMacros,
        },
      });

      // 3. Full reset: Delete all member's daily logs
      await tx.dailyLog.deleteMany({
        where: { memberId: session.userId },
      });

      // 4. Update member's goal if coach specified a custom one
      if (coachRequest.customGoal) {
        await tx.member.update({
          where: { id: session.userId },
          data: { goal: coachRequest.customGoal },
        });
      }
    });

    return NextResponse.json({
      success: true,
      action: "accepted",
      message: "Coach request accepted. Your progress has been reset.",
      coachName: coachRequest.staff.name,
    });
  } catch (error) {
    console.error("Process coach request error:", error);
    return NextResponse.json(
      { error: "Failed to process coach request" },
      { status: 500 }
    );
  }
}
