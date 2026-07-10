import { NextRequest, NextResponse } from "next/server";
import { loadStorefrontProducts } from "@/lib/storefront";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/public/shop/[slug]/products
 * Public product listing with filters (category, brand, price, in-stock),
 * search (q), sort, and pagination. Returns 404 when the store is disabled.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const sp = new URL(request.url).searchParams;
    const num = (v: string | null) =>
      v !== null && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : undefined;

    const data = await loadStorefrontProducts(slug, {
      categoryId: sp.get("category") || undefined,
      brandId: sp.get("brand") || undefined,
      search: sp.get("q") || undefined,
      minPrice: num(sp.get("minPrice")),
      maxPrice: num(sp.get("maxPrice")),
      inStock: sp.get("inStock") === "1" || sp.get("inStock") === "true",
      sort: sp.get("sort") || undefined,
      page: num(sp.get("page")),
    });

    if (!data) {
      return NextResponse.json({ error: "Prodavnica nije dostupna" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error loading products:", error);
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }
}
