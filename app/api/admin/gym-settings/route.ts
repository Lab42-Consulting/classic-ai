import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET - Fetch gym settings
export async function GET() {
  const session = await getSession();

  if (!session || session.userType !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const gym = await prisma.gym.findUnique({
      where: { id: session.gymId },
      select: {
        id: true,
        name: true,
        logo: true,
        about: true,
        address: true,
        phone: true,
        openingHours: true,
        primaryColor: true,
        secondaryColor: true,
      },
    });

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    return NextResponse.json({ gym });
  } catch (error) {
    console.error("Failed to fetch gym settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch gym settings" },
      { status: 500 }
    );
  }
}

// PATCH - Update gym settings
export async function PATCH(request: Request) {
  const session = await getSession();

  if (!session || session.userType !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can update settings
  const staff = await prisma.staff.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });

  if (!staff || staff.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only admins can update gym settings" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      name,
      logo,
      about,
      address,
      phone,
      openingHours,
      primaryColor,
      secondaryColor,
    } = body;

    // Validate required fields
    if (name !== undefined && (!name || name.trim().length === 0)) {
      return NextResponse.json(
        { error: "Gym name is required" },
        { status: 400 }
      );
    }

    // Validate color format if provided
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (primaryColor && !colorRegex.test(primaryColor)) {
      return NextResponse.json(
        { error: "Invalid primary color format. Use hex format (e.g., #ef4444)" },
        { status: 400 }
      );
    }
    if (secondaryColor && !colorRegex.test(secondaryColor)) {
      return NextResponse.json(
        { error: "Invalid secondary color format. Use hex format (e.g., #22c55e)" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (logo !== undefined) updateData.logo = logo || null;
    if (about !== undefined) updateData.about = about?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (openingHours !== undefined) updateData.openingHours = openingHours?.trim() || null;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor || null;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor || null;

    const gym = await prisma.gym.update({
      where: { id: session.gymId },
      data: updateData,
      select: {
        id: true,
        name: true,
        logo: true,
        about: true,
        address: true,
        phone: true,
        openingHours: true,
        primaryColor: true,
        secondaryColor: true,
      },
    });

    return NextResponse.json({ gym });
  } catch (error) {
    console.error("Failed to update gym settings:", error);
    return NextResponse.json(
      { error: "Failed to update gym settings" },
      { status: 500 }
    );
  }
}
