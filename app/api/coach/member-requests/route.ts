import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

// GET - Coach sees pending requests FROM members
export async function GET() {
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
        { error: "Only coaches can view member requests" },
        { status: 403 }
      );
    }

    // Get pending requests from members to this coach
    const requests = await prisma.coachRequest.findMany({
      where: {
        staffId: session.userId,
        initiatedBy: "member",
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            goal: true,
            weight: true,
            height: true,
            gender: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      requests: requests.map((req) => ({
        id: req.id,
        member: {
          id: req.member.id,
          name: req.member.name,
          avatarUrl: req.member.avatarUrl,
          goal: req.member.goal,
          weight: req.member.weight,
          height: req.member.height,
          gender: req.member.gender,
        },
        firstName: req.memberFirstName,
        lastName: req.memberLastName,
        phone: req.memberPhone,
        message: req.memberMessage,
        createdAt: req.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get member requests error:", error);
    return NextResponse.json(
      { error: "Failed to get member requests" },
      { status: 500 }
    );
  }
}
