import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";

// POST - Member sends request to a specific coach
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ coachId: string }> }
) {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const { coachId } = await params;
    const body = await request.json();
    const { firstName, lastName, phone, message } = body;

    // Validation
    if (!firstName || typeof firstName !== "string" || firstName.trim().length === 0) {
      return NextResponse.json(
        { error: "First name is required" },
        { status: 400 }
      );
    }

    if (!lastName || typeof lastName !== "string" || lastName.trim().length === 0) {
      return NextResponse.json(
        { error: "Last name is required" },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Prevent coaches from requesting themselves
    if (authResult.staffId && authResult.staffId === coachId) {
      return NextResponse.json(
        { error: "You cannot request yourself as a coach" },
        { status: 400 }
      );
    }

    // Get member with gym
    const member = await prisma.member.findUnique({
      where: { id: authResult.memberId },
      select: {
        id: true,
        gymId: true,
        coachAssignment: { select: { id: true } },
        coachRequest: { select: { id: true } },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check if member already has a coach
    if (member.coachAssignment) {
      return NextResponse.json(
        { error: "You already have a coach assigned" },
        { status: 400 }
      );
    }

    // Check if member already has a pending request
    if (member.coachRequest) {
      return NextResponse.json(
        { error: "You already have a pending request" },
        { status: 400 }
      );
    }

    // Verify coach exists and is in the same gym
    const coach = await prisma.staff.findFirst({
      where: {
        id: coachId,
        gymId: member.gymId,
        role: "coach",
      },
      select: { id: true, name: true },
    });

    if (!coach) {
      return NextResponse.json(
        { error: "Coach not found in your gym" },
        { status: 404 }
      );
    }

    // Create the coach request
    const coachRequest = await prisma.coachRequest.create({
      data: {
        memberId: member.id,
        staffId: coach.id,
        initiatedBy: "member",
        memberFirstName: firstName.trim(),
        memberLastName: lastName.trim(),
        memberPhone: phone.trim(),
        memberMessage: message?.trim() || null,
      },
      select: {
        id: true,
        createdAt: true,
        staff: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      request: {
        id: coachRequest.id,
        coachName: coachRequest.staff.name,
        createdAt: coachRequest.createdAt,
      },
    });
  } catch (error) {
    console.error("Create coach request error:", error);
    return NextResponse.json(
      { error: "Failed to send request" },
      { status: 500 }
    );
  }
}
