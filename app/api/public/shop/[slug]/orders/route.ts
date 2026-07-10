import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createStorefrontOrder } from "@/lib/storefront";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * POST /api/public/shop/[slug]/orders
 * Place a storefront order (guest checkout; links the member if one is logged in).
 * No online payment — the order starts in status "new" and is fulfilled in person.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const body = await request.json();

    // Link a member if the buyer happens to be logged in (validated per-gym server-side)
    const session = await getSession();
    const memberId =
      session?.userType === "member" ? session.userId : session?.linkedMemberId ?? null;

    const result = await createStorefrontOrder(slug, body, memberId);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status: result.status }
      );
    }
    return NextResponse.json({ success: true, order: result.order });
  } catch (error) {
    console.error("Error placing order:", error);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
}
