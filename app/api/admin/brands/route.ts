import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * GET /api/admin/brands
 * List all product brands for the gym (admin + owner)
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff || !["owner", "admin"].includes(staff.role.toLowerCase())) {
      return NextResponse.json({ error: "Admin or owner access required" }, { status: 403 });
    }

    const brands = await prisma.brand.findMany({
      where: { gymId: staff.gymId },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ brands });
  } catch (error) {
    console.error("Error fetching brands:", error);
    return NextResponse.json({ error: "Failed to fetch brands" }, { status: 500 });
  }
}

/**
 * POST /api/admin/brands
 * Create a new brand (admin + owner)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff || !["owner", "admin"].includes(staff.role.toLowerCase())) {
      return NextResponse.json({ error: "Admin or owner access required" }, { status: 403 });
    }

    const body = await request.json();
    const { name, logoUrl } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Naziv brenda je obavezan" }, { status: 400 });
    }

    const existing = await prisma.brand.findFirst({
      where: { gymId: staff.gymId, name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Brend sa tim nazivom već postoji" },
        { status: 400 }
      );
    }

    const brand = await prisma.brand.create({
      data: {
        gymId: staff.gymId,
        name: name.trim(),
        logoUrl: logoUrl || null,
      },
    });

    return NextResponse.json({ success: true, brand });
  } catch (error) {
    console.error("Error creating brand:", error);
    return NextResponse.json({ error: "Failed to create brand" }, { status: 500 });
  }
}
