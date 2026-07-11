import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

const STORE_SELECT = {
  storeEnabled: true,
  storePickupAddress: true,
  storeDeliveryFeeRsd: true,
  storeFreeDeliveryThresholdRsd: true,
  storeContactPhone: true,
  storeNote: true,
} as const;

async function requireManager() {
  const session = await getSession();
  if (!session || session.userType !== "staff") {
    return { error: "Unauthorized", status: 401 as const };
  }
  const staff = await prisma.staff.findUnique({
    where: { id: session.userId },
    select: { role: true, gymId: true },
  });
  if (!staff || !["owner", "admin"].includes(staff.role.toLowerCase())) {
    return { error: "Admin or owner access required", status: 403 as const };
  }
  return { staff };
}

/** GET /api/admin/store-settings — current storefront config for the gym */
export async function GET() {
  try {
    const auth = await requireManager();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const gym = await prisma.gym.findUnique({
      where: { id: auth.staff.gymId },
      select: STORE_SELECT,
    });
    return NextResponse.json({ store: gym });
  } catch (error) {
    console.error("Error fetching store settings:", error);
    return NextResponse.json({ error: "Failed to fetch store settings" }, { status: 500 });
  }
}

/** PATCH /api/admin/store-settings — update storefront config */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireManager();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const {
      storeEnabled,
      storePickupAddress,
      storeDeliveryFeeRsd,
      storeFreeDeliveryThresholdRsd,
      storeContactPhone,
      storeNote,
    } = body;

    const toRsd = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = Math.round(Number(v));
      return Number.isFinite(n) && n >= 0 ? n : null;
    };

    const data: Record<string, unknown> = {};
    if (storeEnabled !== undefined) data.storeEnabled = Boolean(storeEnabled);
    if (storePickupAddress !== undefined) data.storePickupAddress = storePickupAddress?.trim() || null;
    if (storeDeliveryFeeRsd !== undefined) data.storeDeliveryFeeRsd = toRsd(storeDeliveryFeeRsd);
    if (storeFreeDeliveryThresholdRsd !== undefined)
      data.storeFreeDeliveryThresholdRsd = toRsd(storeFreeDeliveryThresholdRsd);
    if (storeContactPhone !== undefined) data.storeContactPhone = storeContactPhone?.trim() || null;
    if (storeNote !== undefined) data.storeNote = storeNote?.trim() || null;

    const gym = await prisma.gym.update({
      where: { id: auth.staff.gymId },
      data,
      select: STORE_SELECT,
    });

    return NextResponse.json({ success: true, store: gym });
  } catch (error) {
    console.error("Error updating store settings:", error);
    return NextResponse.json({ error: "Failed to update store settings" }, { status: 500 });
  }
}
