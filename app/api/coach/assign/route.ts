import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/coach/assign - Coach assigns themselves to a member with custom plan
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

    // Only coaches can assign members to themselves
    if (staff.role.toLowerCase() !== "coach") {
      return NextResponse.json(
        { error: "Only coaches can assign members" },
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

    // Validate member exists, belongs to gym, and has no coach
    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        gymId: session.gymId,
      },
      include: {
        coachAssignment: true,
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

    // Create the assignment with custom targets
    const assignment = await prisma.coachAssignment.create({
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
      },
    });

    // If coach set a custom goal, update the member's goal too
    if (customGoal) {
      await prisma.member.update({
        where: { id: memberId },
        data: { goal: customGoal },
      });
    }

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id,
        memberId: assignment.memberId,
        memberName: assignment.member.name,
        customGoal: assignment.customGoal,
        customCalories: assignment.customCalories,
        customProtein: assignment.customProtein,
        customCarbs: assignment.customCarbs,
        customFats: assignment.customFats,
        notes: assignment.notes,
        requireExactMacros: assignment.requireExactMacros,
        assignedAt: assignment.assignedAt,
      },
    });
  } catch (error) {
    console.error("Assign member error:", error);
    return NextResponse.json(
      { error: "Failed to assign member" },
      { status: 500 }
    );
  }
}
