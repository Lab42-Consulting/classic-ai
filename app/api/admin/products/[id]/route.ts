import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/products/[id]
 * Get a single product with stock history
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

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await context.params;

    const product = await prisma.product.findFirst({
      where: { id, gymId: staff.gymId },
      include: {
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
 * Update a product
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

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
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
      category,
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

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(sku !== undefined && { sku }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(category !== undefined && { category }),
        ...(price !== undefined && { price: Math.round(price) }),
        ...(costPrice !== undefined && { costPrice: costPrice ? Math.round(costPrice) : null }),
        ...(lowStockAlert !== undefined && { lowStockAlert }),
        ...(isActive !== undefined && { isActive }),
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
 * Delete a product (soft delete by setting isActive to false)
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

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
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
