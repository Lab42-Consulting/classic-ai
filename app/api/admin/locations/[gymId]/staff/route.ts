import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateStaffId, generatePin, hashPin } from "@/lib/auth";

// GET - List staff for a specific gym location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gymId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { gymId } = await params;

    // Verify owner role and gym ownership
    const currentStaff = await prisma.staff.findUnique({
      where: { id: session.userId },
      include: { gym: true },
    });

    if (!currentStaff || currentStaff.role.toLowerCase() !== "owner") {
      return NextResponse.json({ error: "Only owners can view staff" }, { status: 403 });
    }

    // Verify the target gym belongs to the same owner
    const targetGym = await prisma.gym.findUnique({
      where: { id: gymId },
    });

    if (!targetGym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    // Check if gyms are linked by ownerEmail
    if (currentStaff.gym.ownerEmail && targetGym.ownerEmail !== currentStaff.gym.ownerEmail) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // If no ownerEmail, only allow access to own gym
    if (!currentStaff.gym.ownerEmail && targetGym.id !== currentStaff.gym.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get staff for this gym
    const staff = await prisma.staff.findMany({
      where: { gymId },
      select: {
        id: true,
        staffId: true,
        name: true,
        role: true,
      },
      orderBy: [
        { role: "asc" }, // owners first, then admins, then coaches
        { name: "asc" },
      ],
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Error fetching location staff:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST - Add new staff to a specific gym location
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gymId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { gymId } = await params;

    // Verify owner role
    const currentStaff = await prisma.staff.findUnique({
      where: { id: session.userId },
      include: { gym: true },
    });

    if (!currentStaff || currentStaff.role.toLowerCase() !== "owner") {
      return NextResponse.json({ error: "Only owners can add staff" }, { status: 403 });
    }

    // Verify the target gym belongs to the same owner
    const targetGym = await prisma.gym.findUnique({
      where: { id: gymId },
    });

    if (!targetGym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    // Check if gyms are linked by ownerEmail
    if (currentStaff.gym.ownerEmail && targetGym.ownerEmail !== currentStaff.gym.ownerEmail) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // If no ownerEmail, only allow access to own gym
    if (!currentStaff.gym.ownerEmail && targetGym.id !== currentStaff.gym.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { name, role = "admin" } = body;

    if (!name) {
      return NextResponse.json({ error: "Ime je obavezno" }, { status: 400 });
    }

    // Only allow adding admin or coach roles
    const normalizedRole = role.toLowerCase();
    if (normalizedRole !== "admin" && normalizedRole !== "coach") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Generate credentials
    const newStaffId = generateStaffId();
    const newPin = generatePin();
    const hashedPin = await hashPin(newPin);

    // Create staff member
    const newStaff = await prisma.staff.create({
      data: {
        staffId: newStaffId,
        pin: hashedPin,
        name,
        role: normalizedRole,
        gymId,
      },
    });

    // Log the action
    await prisma.subscriptionLog.create({
      data: {
        entityType: "staff",
        entityId: newStaff.id,
        action: "created",
        notes: `Staff "${name}" (${normalizedRole}) added to "${targetGym.name}" by ${currentStaff.name}`,
        performedByType: "staff",
        performedBy: currentStaff.id,
      },
    });

    return NextResponse.json({
      success: true,
      staff: {
        id: newStaff.id,
        staffId: newStaff.staffId,
        name: newStaff.name,
        role: newStaff.role,
      },
      credentials: {
        staffId: newStaffId,
        pin: newPin,
      },
    });
  } catch (error) {
    console.error("Error adding staff:", error);
    return NextResponse.json({ error: "Greška pri dodavanju osoblja" }, { status: 500 });
  }
}
