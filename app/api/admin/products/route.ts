import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * GET /api/admin/products
 * List all products for the gym
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

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const products = await prisma.product.findMany({
      where: { gymId: staff.gymId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/products
 * Create a new product
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
    const {
      name,
      description,
      sku,
      imageUrl,
      category,
      price,
      costPrice,
      currentStock = 0,
      lowStockAlert,
      isActive = true,
    } = body;

    // Validate required fields
    if (!name || price === undefined || price === null) {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 }
      );
    }

    if (price < 0) {
      return NextResponse.json(
        { error: "Price must be positive" },
        { status: 400 }
      );
    }

    // Create product with initial stock log
    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          gymId: staff.gymId,
          name,
          description,
          sku,
          imageUrl,
          category,
          price: Math.round(price),
          costPrice: costPrice ? Math.round(costPrice) : null,
          currentStock: currentStock,
          lowStockAlert,
          isActive,
        },
      });

      // Create initial stock log if stock > 0
      if (currentStock > 0) {
        await tx.stockLog.create({
          data: {
            productId: newProduct.id,
            type: "initial",
            quantity: currentStock,
            previousStock: 0,
            newStock: currentStock,
            staffId: session.userId,
            staffName: staff.name,
            note: "Početni inventar",
          },
        });
      }

      return newProduct;
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
