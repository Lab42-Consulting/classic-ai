import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

/** Serbian-aware slug generator for product detail URLs */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/đ/g, "dj")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * GET /api/admin/products
 * List all products for the gym (Owner only - Magacin feature)
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

    const products = await prisma.product.findMany({
      where: { gymId: staff.gymId },
      include: {
        category: {
          select: { id: true, name: true, color: true, icon: true },
        },
        brand: {
          select: { id: true, name: true },
        },
      },
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
 * Create a new product (Owner only - Magacin feature)
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

    if (!staff || !["owner", "admin"].includes(staff.role.toLowerCase())) {
      return NextResponse.json({ error: "Admin or owner access required" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      sku,
      imageUrl,
      categoryId,
      brandId,
      price,
      costPrice,
      currentStock = 0,
      lowStockAlert,
      isActive = true,
      isVisibleOnline = false,
      isFeatured = false,
      displayOrder,
      slug,
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

    // Verify brand belongs to this gym if provided
    if (brandId) {
      const brand = await prisma.brand.findFirst({
        where: { id: brandId, gymId: staff.gymId },
      });
      if (!brand) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }
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
          categoryId,
          brandId: brandId || null,
          price: Math.round(price),
          costPrice: costPrice ? Math.round(costPrice) : null,
          currentStock: currentStock,
          lowStockAlert,
          isActive,
          isVisibleOnline: Boolean(isVisibleOnline),
          isFeatured: Boolean(isFeatured),
          displayOrder: typeof displayOrder === "number" ? displayOrder : null,
          slug: (slug && slug.trim()) || slugify(name),
        },
        include: {
          category: {
            select: { id: true, name: true, color: true, icon: true },
          },
          brand: {
            select: { id: true, name: true },
          },
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
