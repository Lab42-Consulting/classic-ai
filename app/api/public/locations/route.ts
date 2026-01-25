import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET - List all gyms with slugs for a given owner (for location picker)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerEmail = searchParams.get("ownerEmail");

    // If ownerEmail is provided, get all gyms with that owner
    // If not, get all gyms with slugs (for general discovery)
    let gyms;

    if (ownerEmail) {
      gyms = await prisma.gym.findMany({
        where: {
          ownerEmail,
          slug: { not: null },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
          logo: true,
          primaryColor: true,
        },
        orderBy: { createdAt: "asc" },
      });
    } else {
      // Get gyms that have slugs (published marketing pages)
      gyms = await prisma.gym.findMany({
        where: {
          slug: { not: null },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
          logo: true,
          primaryColor: true,
          ownerEmail: true,
        },
        orderBy: { createdAt: "asc" },
      });
    }

    return NextResponse.json({
      locations: gyms.map((gym) => ({
        id: gym.id,
        name: gym.name,
        slug: gym.slug,
        address: gym.address,
        logoUrl: gym.logo,
        primaryColor: gym.primaryColor,
      })),
    });
  } catch (error) {
    console.error("Error fetching public locations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
