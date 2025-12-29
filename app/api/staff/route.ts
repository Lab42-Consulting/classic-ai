import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

// GET /api/staff - List all staff members in the gym (admin only)
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const currentStaff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!currentStaff || currentStaff.role.toLowerCase() !== "admin") {
      return NextResponse.json(
        { error: "Only admins can view staff list" },
        { status: 403 }
      );
    }

    // Get all staff in the gym with their stats
    const staff = await prisma.staff.findMany({
      where: { gymId: session.gymId },
      select: {
        id: true,
        staffId: true,
        name: true,
        role: true,
        createdAt: true,
        assignedMembers: {
          select: {
            id: true,
            member: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        coachRequests: {
          select: {
            id: true,
            member: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format staff data
    const formattedStaff = staff.map((s) => ({
      id: s.id,
      staffId: s.staffId,
      name: s.name,
      role: s.role,
      createdAt: s.createdAt.toISOString(),
      assignedMembersCount: s.assignedMembers.length,
      pendingRequestsCount: s.coachRequests.length,
      assignedMembers: s.assignedMembers.map((a) => ({
        id: a.member.id,
        name: a.member.name,
      })),
      pendingRequests: s.coachRequests.map((r) => ({
        id: r.member.id,
        name: r.member.name,
      })),
    }));

    return NextResponse.json({ staff: formattedStaff });
  } catch (error) {
    console.error("Get staff error:", error);
    return NextResponse.json(
      { error: "Failed to get staff list" },
      { status: 500 }
    );
  }
}

// Helper to generate staff ID
function generateStaffId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "S-";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper to generate PIN
function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// POST /api/staff - Create a new staff member (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const currentStaff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!currentStaff || currentStaff.role.toLowerCase() !== "admin") {
      return NextResponse.json(
        { error: "Only admins can create staff" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, role } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["coach", "admin"];
    const normalizedRole = (role || "coach").toLowerCase();
    if (!validRoles.includes(normalizedRole)) {
      return NextResponse.json(
        { error: "Invalid role. Use 'coach' or 'admin'" },
        { status: 400 }
      );
    }

    // Generate unique staff ID
    let staffId = generateStaffId();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.staff.findUnique({
        where: {
          staffId_gymId: {
            staffId,
            gymId: session.gymId,
          },
        },
      });
      if (!existing) break;
      staffId = generateStaffId();
      attempts++;
    }

    if (attempts >= 10) {
      return NextResponse.json(
        { error: "Failed to generate unique staff ID" },
        { status: 500 }
      );
    }

    // Generate PIN and hash it
    const pin = generatePin();
    const hashedPin = await bcrypt.hash(pin, 10);

    // Create the staff member
    const newStaff = await prisma.staff.create({
      data: {
        staffId,
        pin: hashedPin,
        name: name.trim(),
        role: normalizedRole,
        gymId: session.gymId,
      },
    });

    return NextResponse.json({
      success: true,
      staff: {
        id: newStaff.id,
        staffId: newStaff.staffId,
        name: newStaff.name,
        role: newStaff.role,
        createdAt: newStaff.createdAt.toISOString(),
      },
      // Return PIN only on creation - cannot be retrieved later
      credentials: {
        staffId: newStaff.staffId,
        pin: pin, // Plain PIN for admin to give to coach
      },
    });
  } catch (error) {
    console.error("Create staff error:", error);
    return NextResponse.json(
      { error: "Failed to create staff" },
      { status: 500 }
    );
  }
}
