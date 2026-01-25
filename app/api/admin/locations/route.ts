import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateStaffId, generatePin, hashPin } from "@/lib/auth";

// GET - List all gyms owned by the current owner
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current staff and their gym
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      include: { gym: true },
    });

    if (!staff || staff.role.toLowerCase() !== "owner") {
      return NextResponse.json({ error: "Only owners can view locations" }, { status: 403 });
    }

    // Get all gyms with the same ownerEmail
    const ownerEmail = staff.gym.ownerEmail;
    if (!ownerEmail) {
      // Single gym, no ownerEmail set
      return NextResponse.json({
        locations: [{
          id: staff.gym.id,
          name: staff.gym.name,
          address: staff.gym.address,
          logo: staff.gym.logo,
          slug: staff.gym.slug,
          memberCount: await prisma.member.count({ where: { gymId: staff.gym.id } }),
          staffCount: await prisma.staff.count({ where: { gymId: staff.gym.id } }),
        }],
      });
    }

    const gyms = await prisma.gym.findMany({
      where: { ownerEmail },
      include: {
        _count: {
          select: {
            members: true,
            staff: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      locations: gyms.map((gym) => ({
        id: gym.id,
        name: gym.name,
        address: gym.address,
        logo: gym.logo,
        slug: gym.slug,
        memberCount: gym._count.members,
        staffCount: gym._count.staff,
      })),
    });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST - Create a new gym location
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current staff and verify owner role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      include: { gym: true },
    });

    if (!staff || staff.role.toLowerCase() !== "owner") {
      return NextResponse.json({ error: "Only owners can add locations" }, { status: 403 });
    }

    const body = await request.json();
    const { name, address, logo, primaryColor, slug } = body;

    if (!name) {
      return NextResponse.json({ error: "Naziv lokacije je obavezan" }, { status: 400 });
    }

    // Validate slug if provided
    let validatedSlug: string | null = null;
    if (slug) {
      const reservedWords = ["manage", "login", "api", "admin", "staff", "member", "gym-signup"];
      const slugRegex = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

      if (!slugRegex.test(slug)) {
        return NextResponse.json(
          { error: "Slug mora sadržati 3-50 karaktera (mala slova, brojevi i crtice)" },
          { status: 400 }
        );
      }

      if (reservedWords.includes(slug.toLowerCase())) {
        return NextResponse.json(
          { error: "Ovaj slug je rezervisan i ne može se koristiti" },
          { status: 400 }
        );
      }

      // Check slug uniqueness
      const existingGym = await prisma.gym.findFirst({
        where: { slug },
      });

      if (existingGym) {
        return NextResponse.json(
          { error: "Ovaj slug je već zauzet" },
          { status: 400 }
        );
      }

      validatedSlug = slug;
    }

    // Get the owner's email to link gyms
    // If the parent gym doesn't have an ownerEmail, we need to create one to link locations
    let ownerEmail = staff.gym.ownerEmail;
    const ownerName = staff.gym.ownerName || staff.name;

    // Owner uses the SAME credentials across all their locations
    // This allows them to log in to any location with their existing staffId and PIN

    // Create new gym and owner staff in transaction
    const result = await prisma.$transaction(async (tx) => {
      // If no ownerEmail exists, generate a unique one and update the parent gym
      if (!ownerEmail) {
        ownerEmail = `owner-${staff.gym.id}@classicgym.local`;
        await tx.gym.update({
          where: { id: staff.gym.id },
          data: {
            ownerEmail,
            ownerName: ownerName || staff.name,
          },
        });
      }

      // Create new gym linked to same owner
      const newGym = await tx.gym.create({
        data: {
          name,
          address: address || null,
          logo: logo || staff.gym.logo, // Inherit logo from parent if not provided
          primaryColor: primaryColor || staff.gym.primaryColor || "#ef4444",
          slug: validatedSlug,
          ownerEmail,
          ownerName,
          phone: staff.gym.phone, // Inherit from parent
          subscriptionStatus: "active", // Inherit active status
          subscriptionTier: staff.gym.subscriptionTier,
          subscribedAt: new Date(),
          subscribedUntil: staff.gym.subscribedUntil,
          settings: {
            accentColor: primaryColor || staff.gym.primaryColor || "#ef4444",
          },
        },
      });

      // Create owner staff for this location using the SAME credentials as the parent location
      // This allows the owner to log in with the same staffId and PIN across all locations
      const newStaff = await tx.staff.create({
        data: {
          staffId: staff.staffId, // Same staffId as parent
          pin: staff.pin, // Same hashed PIN as parent
          name: staff.name,
          role: "owner",
          gymId: newGym.id,
        },
      });

      // Log the location creation
      await tx.subscriptionLog.create({
        data: {
          entityType: "gym",
          entityId: newGym.id,
          action: "created",
          notes: `New location "${name}" added by ${staff.name}`,
          performedByType: "staff",
          performedBy: staff.id,
        },
      });

      return { gym: newGym, staff: newStaff };
    });

    // No new credentials to return - owner uses the same credentials for all locations
    return NextResponse.json({
      success: true,
      location: {
        id: result.gym.id,
        name: result.gym.name,
        address: result.gym.address,
        slug: result.gym.slug,
      },
      // Owner uses the same credentials across all locations
      sameCredentials: true,
      message: "Koristite iste kredencijale za prijavu na novu lokaciju",
    });
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json({ error: "Greška pri kreiranju lokacije" }, { status: 500 });
  }
}
