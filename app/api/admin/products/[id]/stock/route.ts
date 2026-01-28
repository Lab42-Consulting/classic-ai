import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/products/[id]/stock
 * Adjust product stock (purchase, adjustment, return)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true, name: true },
    });

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await context.params;

    // Verify product belongs to this gym
    const product = await prisma.product.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await request.json();
    const { type, quantity, note } = body;

    // Validate type
    const validTypes = ["purchase", "adjustment", "return"];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid adjustment type. Must be: purchase, adjustment, or return" },
        { status: 400 }
      );
    }

    // Validate quantity
    if (quantity === undefined || quantity === null || quantity === 0) {
      return NextResponse.json(
        { error: "Quantity is required and cannot be zero" },
        { status: 400 }
      );
    }

    // Calculate new stock
    const newStock = product.currentStock + quantity;

    if (newStock < 0) {
      return NextResponse.json(
        { error: `Insufficient stock. Current: ${product.currentStock}, Requested: ${quantity}` },
        { status: 400 }
      );
    }

    // Update stock and create log in transaction
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Create stock log
      await tx.stockLog.create({
        data: {
          productId: id,
          type,
          quantity,
          previousStock: product.currentStock,
          newStock,
          staffId: session.userId,
          staffName: staff.name,
          note,
        },
      });

      // Update product stock
      return tx.product.update({
        where: { id },
        data: { currentStock: newStock },
      });
    });

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      adjustment: {
        type,
        quantity,
        previousStock: product.currentStock,
        newStock,
      },
    });
  } catch (error) {
    console.error("Error adjusting stock:", error);
    return NextResponse.json(
      { error: "Failed to adjust stock" },
      { status: 500 }
    );
  }
}
