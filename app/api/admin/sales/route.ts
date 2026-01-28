import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * GET /api/admin/sales
 * List sales with optional date filtering
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const productId = searchParams.get("productId");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const whereClause: Record<string, unknown> = {
      gymId: staff.gymId,
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        (whereClause.createdAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (whereClause.createdAt as Record<string, Date>).lte = end;
      }
    }

    if (productId) {
      whereClause.productId = productId;
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 1000),
    });

    // Calculate summary
    const summary = {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      totalUnits: sales.reduce((sum, sale) => sum + sale.quantity, 0),
    };

    return NextResponse.json({ sales, summary });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sales
 * Record a new sale
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { productId, quantity = 1, memberId, paymentMethod } = body;

    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be at least 1" },
        { status: 400 }
      );
    }

    // Get product and verify it belongs to this gym
    const product = await prisma.product.findFirst({
      where: { id: productId, gymId: staff.gymId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!product.isActive) {
      return NextResponse.json(
        { error: "Product is not available for sale" },
        { status: 400 }
      );
    }

    // Check stock
    if (product.currentStock < quantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${product.currentStock}` },
        { status: 400 }
      );
    }

    // Get member name if provided
    let memberName: string | null = null;
    if (memberId) {
      const member = await prisma.member.findFirst({
        where: { id: memberId, gymId: staff.gymId },
        select: { name: true },
      });
      memberName = member?.name || null;
    }

    // Create sale and update stock in transaction
    const result = await prisma.$transaction(async (tx) => {
      const totalAmount = product.price * quantity;

      // Create sale
      const sale = await tx.sale.create({
        data: {
          productId,
          gymId: staff.gymId,
          quantity,
          unitPrice: product.price,
          totalAmount,
          memberId,
          memberName,
          staffId: session.userId,
          staffName: staff.name,
          paymentMethod,
        },
        include: {
          product: {
            select: { id: true, name: true },
          },
        },
      });

      // Create stock log for the sale
      await tx.stockLog.create({
        data: {
          productId,
          type: "sale",
          quantity: -quantity,
          previousStock: product.currentStock,
          newStock: product.currentStock - quantity,
          staffId: session.userId,
          staffName: staff.name,
          note: `Prodaja #${sale.id.slice(-6)}`,
        },
      });

      // Update product stock
      await tx.product.update({
        where: { id: productId },
        data: { currentStock: product.currentStock - quantity },
      });

      return sale;
    });

    return NextResponse.json({ success: true, sale: result });
  } catch (error) {
    console.error("Error recording sale:", error);
    return NextResponse.json(
      { error: "Failed to record sale" },
      { status: 500 }
    );
  }
}
