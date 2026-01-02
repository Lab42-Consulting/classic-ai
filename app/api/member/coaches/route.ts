import { NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";

// GET - List available coaches in member's gym
export async function GET() {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    // Get member with gym and coach assignment
    const member = await prisma.member.findUnique({
      where: { id: authResult.memberId },
      select: {
        gymId: true,
        coachAssignment: {
          select: {
            id: true,
            staffId: true,
            staff: {
              select: { name: true },
            },
          },
        },
        coachRequest: {
          select: {
            id: true,
            staffId: true,
            initiatedBy: true,
            createdAt: true,
            staff: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get all coaches in this gym with their member counts
    const coaches = await prisma.staff.findMany({
      where: {
        gymId: member.gymId,
        role: "coach",
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: { assignedMembers: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Get pending request info (if member sent a request)
    const pendingRequest = member.coachRequest;

    return NextResponse.json({
      coaches: coaches.map((coach) => ({
        id: coach.id,
        name: coach.name,
        assignedMembersCount: coach._count.assignedMembers,
        hasPendingRequest: pendingRequest?.staffId === coach.id,
      })),
      currentCoach: member.coachAssignment
        ? {
            id: member.coachAssignment.staffId,
            name: member.coachAssignment.staff.name,
          }
        : null,
      pendingRequest: pendingRequest
        ? {
            id: pendingRequest.id,
            coachId: pendingRequest.staffId,
            coachName: pendingRequest.staff.name,
            initiatedBy: pendingRequest.initiatedBy,
            createdAt: pendingRequest.createdAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Get coaches error:", error);
    return NextResponse.json(
      { error: "Failed to get coaches" },
      { status: 500 }
    );
  }
}
