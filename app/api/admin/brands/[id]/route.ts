import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function requireManager() {
  const session = await getSession();
  if (!session || session.userType !== "staff") {
    return { error: "Unauthorized", status: 401 as const };
  }
  const staff = await prisma.staff.findUnique({
    where: { id: session.userId },
    select: { role: true, gymId: true },
  });
  if (!staff || !["owner", "admin"].includes(staff.role.toLowerCase())) {
    return { error: "Admin or owner access required", status: 403 as const };
  }
  return { staff };
}

/**
 * PUT /api/admin/brands/[id]
 * Update a brand (admin + owner)
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireManager();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { staff } = auth;
    const { id } = await context.params;

    const existing = await prisma.brand.findFirst({
      where: { id, gymId: staff.gymId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Brend nije pronađen" }, { status: 404 });
    }

    const body = await request.json();
    const { name, logoUrl } = body;

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: "Naziv brenda ne može biti prazan" }, { status: 400 });
    }

    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.brand.findFirst({
        where: { gymId: staff.gymId, name: name.trim(), id: { not: id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Brend sa tim nazivom već postoji" },
          { status: 400 }
        );
      }
    }

    const brand = await prisma.brand.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
      },
    });

    return NextResponse.json({ success: true, brand });
  } catch (error) {
    console.error("Error updating brand:", error);
    return NextResponse.json({ error: "Failed to update brand" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/brands/[id]
 * Delete a brand (admin + owner). Blocked while products reference it.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireManager();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { staff } = auth;
    const { id } = await context.params;

    const existing = await prisma.brand.findFirst({
      where: { id, gymId: staff.gymId },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Brend nije pronađen" }, { status: 404 });
    }

    if (existing._count.products > 0) {
      return NextResponse.json(
        { error: `Brend ima ${existing._count.products} proizvoda. Premestite ih pre brisanja.` },
        { status: 400 }
      );
    }

    await prisma.brand.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting brand:", error);
    return NextResponse.json({ error: "Failed to delete brand" }, { status: 500 });
  }
}
