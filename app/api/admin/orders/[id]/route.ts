import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireManager } from "@/lib/admin-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Allowed status transitions (fulfilled & cancelled are terminal → guards double-fulfill)
const NEXT_STATUSES: Record<string, string[]> = {
  new: ["confirmed", "ready", "fulfilled", "cancelled"],
  confirmed: ["ready", "fulfilled", "cancelled"],
  ready: ["fulfilled", "cancelled"],
  fulfilled: [],
  cancelled: [],
};

/** GET /api/admin/orders/[id] — order detail with items */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireManager();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { id } = await context.params;
    const order = await prisma.order.findFirst({
      where: { id, gymId: auth.staff.gymId },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Porudžbina nije pronađena" }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error loading order:", error);
    return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
  }
}

/** PATCH /api/admin/orders/[id] — advance status / cancel / fulfill */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireManager();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { id } = await context.params;
    const { status, cancelledReason } = await request.json();

    const order = await prisma.order.findFirst({
      where: { id, gymId: auth.staff.gymId },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Porudžbina nije pronađena" }, { status: 404 });
    }

    const allowed = NEXT_STATUSES[order.status] ?? [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Nedozvoljena promena statusa (${order.status} → ${status})` },
        { status: 400 }
      );
    }

    if (status === "cancelled") {
      if (!cancelledReason?.trim()) {
        return NextResponse.json({ error: "Razlog otkazivanja je obavezan" }, { status: 400 });
      }
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { status: "cancelled", cancelledReason: cancelledReason.trim() },
      });
      return NextResponse.json({ success: true, order: updated });
    }

    if (status === "fulfilled") {
      // Decrement stock and create Sale + StockLog rows so store orders flow into
      // the existing POS reporting. Runs in a transaction; guarded against re-fulfillment above.
      const updated = await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          if (!item.productId) continue;
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { currentStock: true },
          });
          if (!product) continue;
          const newStock = Math.max(0, product.currentStock - item.quantity);
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: newStock },
          });
          await tx.stockLog.create({
            data: {
              productId: item.productId,
              type: "sale",
              quantity: -item.quantity,
              note: `Porudžbina #${order.orderNumber}`,
              staffId: auth.staff.id,
              staffName: auth.staff.name,
              previousStock: product.currentStock,
              newStock,
            },
          });
          await tx.sale.create({
            data: {
              productId: item.productId,
              gymId: auth.staff.gymId,
              quantity: item.quantity,
              unitPrice: item.unitPriceRsd,
              totalAmount: item.lineTotalRsd,
              memberId: order.memberId,
              staffId: auth.staff.id,
              staffName: auth.staff.name,
              paymentMethod: "cash",
            },
          });
        }
        return tx.order.update({
          where: { id: order.id },
          data: { status: "fulfilled", fulfilledAt: new Date() },
        });
      });
      return NextResponse.json({ success: true, order: updated });
    }

    // Plain forward transition (confirmed / ready)
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status },
    });
    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
