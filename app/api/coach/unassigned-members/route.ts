import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/coach/unassigned-members - List gym members without a coach
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get staff info to check role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Only coaches and admins can view unassigned members
    const isCoachOrAdmin = ["coach", "admin"].includes(staff.role.toLowerCase());
    if (!isCoachOrAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get gym members who don't have a coach assignment
    const unassignedMembers = await prisma.member.findMany({
      where: {
        gymId: session.gymId,
        coachAssignment: null, // No coach assigned
        status: "active",
      },
      select: {
        id: true,
        memberId: true,
        name: true,
        goal: true,
        weight: true,
        height: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      members: unassignedMembers,
      count: unassignedMembers.length,
    });
  } catch (error) {
    console.error("Get unassigned members error:", error);
    return NextResponse.json(
      { error: "Failed to get unassigned members" },
      { status: 500 }
    );
  }
}
