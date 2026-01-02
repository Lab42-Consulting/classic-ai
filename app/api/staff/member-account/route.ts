import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { hashPin, generateMemberId } from "@/lib/auth";

// GET /api/staff/member-account - Check if staff has a linked member account
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      include: {
        linkedMember: {
          select: {
            id: true,
            memberId: true,
            name: true,
            avatarUrl: true,
            goal: true,
            weight: true,
          },
        },
      },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    return NextResponse.json({
      hasLinkedMember: !!staff.linkedMember,
      linkedMember: staff.linkedMember,
    });
  } catch (error) {
    console.error("Get staff member account error:", error);
    return NextResponse.json(
      { error: "Failed to get member account info" },
      { status: 500 }
    );
  }
}

// POST /api/staff/member-account - Create or link a member account for staff
// Body: { action: "create", goal, weight?, height? } or { action: "link", memberId, pin }
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      include: { linkedMember: true },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    if (staff.linkedMember) {
      return NextResponse.json(
        { error: "Already have a linked member account" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === "create") {
      // Create a new member account for the staff
      const { goal, weight, height } = body;

      if (!goal || !["fat_loss", "muscle_gain", "recomposition"].includes(goal)) {
        return NextResponse.json(
          { error: "Valid goal is required" },
          { status: 400 }
        );
      }

      // Weight and height are required for accurate calorie calculations
      if (!weight || !height) {
        return NextResponse.json(
          { error: "Weight and height are required" },
          { status: 400 }
        );
      }

      const parsedWeight = parseFloat(weight);
      const parsedHeight = parseFloat(height);

      if (isNaN(parsedWeight) || parsedWeight <= 0 || parsedWeight > 300) {
        return NextResponse.json(
          { error: "Invalid weight value" },
          { status: 400 }
        );
      }

      if (isNaN(parsedHeight) || parsedHeight <= 0 || parsedHeight > 250) {
        return NextResponse.json(
          { error: "Invalid height value" },
          { status: 400 }
        );
      }

      // Generate a unique member ID
      const memberId = generateMemberId();

      // Use the same PIN as the staff account (hashed)
      const member = await prisma.member.create({
        data: {
          memberId,
          pin: staff.pin, // Same PIN as staff
          name: staff.name,
          avatarUrl: staff.avatarUrl,
          goal,
          weight: parsedWeight,
          height: parsedHeight,
          gymId: staff.gymId,
          locale: staff.locale,
          hasSeenOnboarding: true, // Staff already knows the system
          subscriptionStatus: "active", // Staff get free member access
        },
      });

      // Link the member to the staff
      await prisma.staff.update({
        where: { id: staff.id },
        data: { linkedMemberId: member.id },
      });

      return NextResponse.json({
        success: true,
        action: "created",
        member: {
          id: member.id,
          memberId: member.memberId,
          name: member.name,
          goal: member.goal,
        },
      });
    } else if (action === "link") {
      // Link to an existing member account
      const { memberId, pin } = body;

      if (!memberId || !pin) {
        return NextResponse.json(
          { error: "Member ID and PIN are required" },
          { status: 400 }
        );
      }

      // Find the member in the same gym
      const member = await prisma.member.findFirst({
        where: {
          memberId: memberId.toUpperCase(),
          gymId: staff.gymId,
        },
      });

      if (!member) {
        return NextResponse.json(
          { error: "Member not found in your gym" },
          { status: 404 }
        );
      }

      // Check if already linked to another staff
      const existingLink = await prisma.staff.findFirst({
        where: { linkedMemberId: member.id },
      });

      if (existingLink) {
        return NextResponse.json(
          { error: "This member account is already linked to another staff member" },
          { status: 400 }
        );
      }

      // Verify PIN
      const bcrypt = await import("bcryptjs");
      const isValidPin = await bcrypt.compare(pin, member.pin);

      if (!isValidPin) {
        return NextResponse.json(
          { error: "Invalid PIN" },
          { status: 401 }
        );
      }

      // Link the member to the staff
      await prisma.staff.update({
        where: { id: staff.id },
        data: { linkedMemberId: member.id },
      });

      return NextResponse.json({
        success: true,
        action: "linked",
        member: {
          id: member.id,
          memberId: member.memberId,
          name: member.name,
          goal: member.goal,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'create' or 'link'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Staff member account error:", error);
    return NextResponse.json(
      { error: "Failed to process member account request" },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/member-account - Unlink member account from staff
export async function DELETE() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    if (!staff.linkedMemberId) {
      return NextResponse.json(
        { error: "No linked member account" },
        { status: 400 }
      );
    }

    // Unlink (but don't delete the member account)
    await prisma.staff.update({
      where: { id: staff.id },
      data: { linkedMemberId: null },
    });

    return NextResponse.json({
      success: true,
      message: "Member account unlinked",
    });
  } catch (error) {
    console.error("Unlink member account error:", error);
    return NextResponse.json(
      { error: "Failed to unlink member account" },
      { status: 500 }
    );
  }
}
