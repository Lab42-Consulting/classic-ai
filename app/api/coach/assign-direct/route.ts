import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/coach/assign-direct - Directly assign a member to coach (bypasses request flow)
// Used when coach registers a member or for bulk assignment of unassigned gym members
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

    // Only coaches can assign themselves
    if (staff.role.toLowerCase() !== "coach") {
      return NextResponse.json(
        { error: "Only coaches can assign members to themselves" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId } = body;

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

    // Delete any pending coach requests for this member
    await prisma.coachRequest.deleteMany({
      where: { memberId },
    });

    // Create direct assignment
    const assignment = await prisma.coachAssignment.create({
      data: {
        staffId: session.userId,
        memberId,
      },
      include: {
        member: {
          select: {
            id: true,
            memberId: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id,
        member: assignment.member,
        assignedAt: assignment.assignedAt,
      },
    });
  } catch (error) {
    console.error("Direct assignment error:", error);
    return NextResponse.json(
      { error: "Failed to assign member" },
      { status: 500 }
    );
  }
}
