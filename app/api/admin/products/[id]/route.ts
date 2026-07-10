import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/products/[id]
 * Get a single product with stock history (Owner only - Magacin feature)
 */
export async function GET(request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;

    const product = await prisma.product.findFirst({
      where: { id, gymId: staff.gymId },
      include: {
        category: {
          select: { id: true, name: true, color: true, icon: true },
        },
        stockLogs: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        _count: {
          select: { sales: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/products/[id]
 * Update a product (Owner only - Magacin feature)
 */
export async function PUT(request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;

    // Verify product belongs to this gym
    const existingProduct = await prisma.product.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      sku,
      imageUrl,
      categoryId,
      price,
      costPrice,
      lowStockAlert,
      isActive,
    } = body;

    // Validate
    if (name !== undefined && !name.trim()) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }

    if (price !== undefined && price < 0) {
      return NextResponse.json(
        { error: "Price must be positive" },
        { status: 400 }
      );
    }

    // Verify category belongs to this gym if provided
    if (categoryId) {
      const category = await prisma.productCategory.findFirst({
        where: { id: categoryId, gymId: staff.gymId },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(sku !== undefined && { sku }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(categoryId !== undefined && { categoryId }),
        ...(price !== undefined && { price: Math.round(price) }),
        ...(costPrice !== undefined && { costPrice: costPrice ? Math.round(costPrice) : null }),
        ...(lowStockAlert !== undefined && { lowStockAlert }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        category: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/products/[id]
 * Delete a product (soft delete by setting isActive to false) (Owner only - Magacin feature)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;

    // Verify product belongs to this gym
    const existingProduct = await prisma.product.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if product has any sales - if so, soft delete
    const salesCount = await prisma.sale.count({
      where: { productId: id },
    });

    if (salesCount > 0) {
      // Soft delete - deactivate the product
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true, softDeleted: true });
    }

    // Hard delete if no sales history
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
