import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * GET /api/owner/categories
 * List all product categories for the owner's gym
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

    const categories = await prisma.productCategory.findMany({
      where: { gymId: staff.gymId },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/owner/categories
 * Create a new product category
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
    const { name, color, icon, parentId, displayOrder } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    // Check if category with same name already exists
    const existing = await prisma.productCategory.findFirst({
      where: {
        gymId: staff.gymId,
        name: name.trim(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Kategorija sa tim nazivom već postoji" },
        { status: 400 }
      );
    }

    // Single-level nesting: a parent must be an existing top-level category in this gym
    if (parentId) {
      const parent = await prisma.productCategory.findFirst({
        where: { id: parentId, gymId: staff.gymId },
        select: { id: true, parentId: true },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Nadređena kategorija nije pronađena" },
          { status: 400 }
        );
      }
      if (parent.parentId) {
        return NextResponse.json(
          { error: "Potkategorija ne može imati potkategorije" },
          { status: 400 }
        );
      }
    }

    const category = await prisma.productCategory.create({
      data: {
        gymId: staff.gymId,
        name: name.trim(),
        color: color || null,
        icon: icon || null,
        parentId: parentId || null,
        displayOrder: typeof displayOrder === "number" ? displayOrder : null,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
