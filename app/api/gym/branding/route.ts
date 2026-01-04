import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { validateImageUpload, processImageUpload } from "@/lib/storage";

// GET /api/gym/branding - Get gym branding settings
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get staff info to check role and gym
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    if (staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get gym branding
    const gym = await prisma.gym.findUnique({
      where: { id: staff.gymId },
      select: {
        id: true,
        name: true,
        logo: true,
        primaryColor: true,
        secondaryColor: true,
        settings: true,
      },
    });

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    return NextResponse.json(gym);
  } catch (error) {
    console.error("Error fetching gym branding:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/gym/branding - Update gym branding settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get staff info to check role and gym
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    if (staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { logo, primaryColor, secondaryColor } = body;

    // Validate colors if provided
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (primaryColor && !colorRegex.test(primaryColor)) {
      return NextResponse.json(
        { error: "Invalid primary color format" },
        { status: 400 }
      );
    }
    if (secondaryColor && !colorRegex.test(secondaryColor)) {
      return NextResponse.json(
        { error: "Invalid secondary color format" },
        { status: 400 }
      );
    }

    // Validate logo if provided
    if (logo !== undefined) {
      const logoValidation = validateImageUpload(logo, "branding");
      if (!logoValidation.valid) {
        return NextResponse.json({ error: logoValidation.error }, { status: 400 });
      }
    }

    // Get current gym for logo cleanup
    const currentGym = await prisma.gym.findUnique({
      where: { id: staff.gymId },
      select: { logo: true },
    });

    // Process logo upload to blob storage
    let processedLogo: string | null | undefined = undefined;
    if (logo !== undefined) {
      const imageResult = await processImageUpload(
        logo,
        "branding",
        staff.gymId,
        currentGym?.logo
      );
      if (imageResult.error) {
        return NextResponse.json({ error: imageResult.error }, { status: 400 });
      }
      processedLogo = imageResult.url;
    }

    // Update gym branding
    const updatedGym = await prisma.gym.update({
      where: { id: staff.gymId },
      data: {
        logo: processedLogo ?? undefined,
        primaryColor: primaryColor ?? undefined,
        secondaryColor: secondaryColor ?? undefined,
      },
      select: {
        id: true,
        name: true,
        logo: true,
        primaryColor: true,
        secondaryColor: true,
      },
    });

    return NextResponse.json(updatedGym);
  } catch (error) {
    console.error("Error updating gym branding:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
