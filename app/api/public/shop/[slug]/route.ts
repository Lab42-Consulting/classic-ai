import { NextResponse } from "next/server";
import { loadStorefrontData } from "@/lib/storefront";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/public/shop/[slug]
 * Public storefront landing data (store info, categories, brands, featured products).
 * Returns 404 when the gym doesn't exist or its storefront is disabled.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const data = await loadStorefrontData(slug);
    if (!data) {
      return NextResponse.json({ error: "Prodavnica nije dostupna" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error loading storefront:", error);
    return NextResponse.json({ error: "Failed to load storefront" }, { status: 500 });
  }
}
