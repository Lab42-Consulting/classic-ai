import { NextResponse } from "next/server";
import { loadStorefrontProduct } from "@/lib/storefront";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ slug: string; productId: string }>;
}

/**
 * GET /api/public/shop/[slug]/products/[productId]
 * Public product detail (active + online only) + related products.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug, productId } = await context.params;
    const data = await loadStorefrontProduct(slug, productId);
    if (!data) {
      return NextResponse.json({ error: "Proizvod nije pronađen" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error loading product:", error);
    return NextResponse.json({ error: "Failed to load product" }, { status: 500 });
  }
}
