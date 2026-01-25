import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

interface GalleryImage {
  id: string;
  imageUrl: string;
  caption: string;
}

// GET - Get gym data by slug for marketing page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Slug is required" },
        { status: 400 }
      );
    }

    // Get the gym by slug
    const gym = await prisma.gym.findFirst({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        about: true,
        address: true,
        phone: true,
        openingHours: true,
        primaryColor: true,
        galleryImages: true,
        ownerEmail: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!gym) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Get trainers for this specific gym (location-specific)
    const trainersRaw = await prisma.staff.findMany({
      where: {
        gymId: gym.id,
        role: { in: ["coach", "COACH"] },
        showOnWebsite: true,
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        bio: true,
        specialty: true,
        linkedMember: {
          select: {
            avatarUrl: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const trainers = trainersRaw.map((t) => ({
      id: t.id,
      name: t.name,
      avatarUrl: t.avatarUrl || t.linkedMember?.avatarUrl || null,
      bio: t.bio,
      specialty: t.specialty,
    }));

    // Get all sibling locations (same owner) for location switcher
    let siblingLocations: { id: string; name: string; slug: string }[] = [];
    if (gym.ownerEmail) {
      const siblings = await prisma.gym.findMany({
        where: {
          ownerEmail: gym.ownerEmail,
          slug: { not: null },
          id: { not: gym.id }, // Exclude current gym
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: { createdAt: "asc" },
      });
      siblingLocations = siblings.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug!,
      }));
    }

    // For shared content (about), get from primary gym if this gym doesn't have it
    let sharedAbout = gym.about;
    if (!sharedAbout && gym.ownerEmail) {
      const primaryGym = await prisma.gym.findFirst({
        where: {
          ownerEmail: gym.ownerEmail,
          about: { not: null },
        },
        select: { about: true },
        orderBy: { createdAt: "asc" },
      });
      sharedAbout = primaryGym?.about || null;
    }

    return NextResponse.json({
      gym: {
        id: gym.id,
        name: gym.name,
        slug: gym.slug,
        logo: gym.logo,
        about: sharedAbout,
        address: gym.address,
        phone: gym.phone,
        openingHours: gym.openingHours,
        primaryColor: gym.primaryColor,
        galleryImages: (gym.galleryImages as unknown as GalleryImage[]) || [],
        memberCount: gym._count.members,
      },
      trainers,
      siblingLocations,
    });
  } catch (error) {
    console.error("Error fetching location by slug:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
