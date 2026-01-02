import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/coach/assign - Coach sends a request to be assigned to a member
// Member must accept/decline before assignment takes effect
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get staff info to check role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, name: true },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Only coaches can request to assign members
    if (staff.role.toLowerCase() !== "coach") {
      return NextResponse.json(
        { error: "Only coaches can request member assignments" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId, customGoal, customCalories, customProtein, customCarbs, customFats, notes, requireExactMacros } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      );
    }

    // Validate member exists, belongs to gym, has no coach, and no pending request
    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        gymId: session.gymId,
      },
      include: {
        coachAssignment: true,
        coachRequest: true,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Member not found in your gym" },
        { status: 404 }
      );
    }

    if (member.coachAssignment) {
      return NextResponse.json(
        { error: "Member already has a coach assigned" },
        { status: 400 }
      );
    }

    // Check for existing pending request
    if (member.coachRequest) {
      // If it's a member-initiated request TO THIS SAME COACH, we can replace it
      // with a proper coach-initiated request that includes the plan
      if (member.coachRequest.initiatedBy === "member" && member.coachRequest.staffId === session.userId) {
        // Delete the member's interest signal - we're replacing it with a coach request
        await prisma.coachRequest.delete({
          where: { id: member.coachRequest.id },
        });
      } else {
        // Either it's a coach-initiated request already, or it's to a different coach
        return NextResponse.json(
          { error: "Member already has a pending coach request" },
          { status: 400 }
        );
      }
    }

    // Create a pending coach request (NOT an assignment)
    const coachRequest = await prisma.coachRequest.create({
      data: {
        staffId: session.userId,
        memberId: memberId,
        customGoal: customGoal || null,
        customCalories: customCalories ? parseInt(customCalories) : null,
        customProtein: customProtein ? parseInt(customProtein) : null,
        customCarbs: customCarbs ? parseInt(customCarbs) : null,
        customFats: customFats ? parseInt(customFats) : null,
        notes: notes || null,
        requireExactMacros: requireExactMacros || false,
      },
      include: {
        member: {
          select: {
            id: true,
            memberId: true,
            name: true,
            goal: true,
            weight: true,
          },
        },
        staff: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      requestSent: true, // Flag indicating this is a request, not immediate assignment
      request: {
        id: coachRequest.id,
        memberId: coachRequest.memberId,
        memberName: coachRequest.member.name,
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
    console.error("Coach request error:", error);
    return NextResponse.json(
      { error: "Failed to send coach request" },
      { status: 500 }
    );
  }
}
