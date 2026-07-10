import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireManager } from "@/lib/admin-auth";

/**
 * GET /api/admin/orders
 * List storefront orders for the gym (admin + owner). Filter by ?status and ?q.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireManager();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const sp = new URL(request.url).searchParams;
    const status = sp.get("status") || undefined;
    const q = sp.get("q")?.trim() || undefined;

    const where: Record<string, unknown> = { gymId: auth.staff.gymId };
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { customerName: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q } },
        { orderNumber: { contains: q } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { items: true } } },
      take: 200,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error listing orders:", error);
    return NextResponse.json({ error: "Failed to list orders" }, { status: 500 });
  }
}
