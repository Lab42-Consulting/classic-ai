import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

interface GalleryImage {
  id: string;
  imageUrl: string;
  caption: string;
}

// GET - Fetch gallery images
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const gym = await prisma.gym.findUnique({
      where: { id: staff.gymId },
      select: { galleryImages: true },
    });

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    const images = (gym.galleryImages as unknown as GalleryImage[]) || [];
    return NextResponse.json({ images });
  } catch (error) {
    console.error("Failed to fetch gallery:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update gallery images (full replacement)
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { images } = body;

    if (!Array.isArray(images)) {
      return NextResponse.json({ error: "Invalid images format" }, { status: 400 });
    }

    // Validate each image
    for (const img of images) {
      if (!img.id || !img.imageUrl || typeof img.caption !== "string") {
        return NextResponse.json({ error: "Invalid image structure" }, { status: 400 });
      }
    }

    // Limit to 6 images
    if (images.length > 6) {
      return NextResponse.json({ error: "Maximum 6 gallery images allowed" }, { status: 400 });
    }

    const gym = await prisma.gym.update({
      where: { id: staff.gymId },
      data: { galleryImages: images },
      select: { galleryImages: true },
    });

    return NextResponse.json({ images: gym.galleryImages });
  } catch (error) {
    console.error("Failed to update gallery:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
