import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

// PATCH - Update location details (name, address, slug)
export async function PATCH(
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
      return NextResponse.json({ error: "Only owners can update locations" }, { status: 403 });
    }

    const body = await request.json();
    const { name, address, slug } = body;

    // Verify the gym belongs to this owner (same ownerEmail)
    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      select: { ownerEmail: true },
    });

    if (!gym) {
      return NextResponse.json({ error: "Lokacija nije pronađena" }, { status: 404 });
    }

    if (gym.ownerEmail !== currentStaff.gym.ownerEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate slug if provided
    if (slug !== undefined && slug !== null && slug !== "") {
      const reservedWords = ["manage", "login", "api", "admin", "staff", "member", "gym-signup"];
      if (reservedWords.includes(slug.toLowerCase())) {
        return NextResponse.json({ error: "Ovaj slug je rezervisan" }, { status: 400 });
      }

      const slugRegex = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
      if (slug.length < 3) {
        return NextResponse.json({ error: "Slug mora imati najmanje 3 karaktera" }, { status: 400 });
      }
      if (slug.length > 50) {
        return NextResponse.json({ error: "Slug može imati najviše 50 karaktera" }, { status: 400 });
      }
      if (!slugRegex.test(slug) && slug.length >= 3) {
        // Allow short valid slugs
        if (!/^[a-z0-9-]+$/.test(slug)) {
          return NextResponse.json({ error: "Slug može sadržati samo mala slova, brojeve i crtice" }, { status: 400 });
        }
        if (slug.startsWith("-") || slug.endsWith("-")) {
          return NextResponse.json({ error: "Slug ne može početi ili završiti crticom" }, { status: 400 });
        }
      }

      // Check uniqueness
      const existingGym = await prisma.gym.findFirst({
        where: {
          slug: slug,
          id: { not: gymId },
        },
      });

      if (existingGym) {
        return NextResponse.json({ error: "Ovaj slug je već zauzet" }, { status: 400 });
      }
    }

    // Update the gym
    const updatedGym = await prisma.gym.update({
      where: { id: gymId },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address: address || null }),
        ...(slug !== undefined && { slug: slug || null }),
      },
      select: {
        id: true,
        name: true,
        address: true,
        slug: true,
      },
    });

    return NextResponse.json({ location: updatedGym });
  } catch (error) {
    console.error("Error updating location:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
