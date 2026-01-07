import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { changeSubscriptionTier, type GymTier } from "@/lib/stripe";
import { isValidTier, isTierHigher, getTierName, formatTierPrice } from "@/lib/subscription/tiers";

// POST /api/stripe/change-tier - Change subscription tier (upgrade/downgrade)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify this is an admin
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff || staff.role.toUpperCase() !== "ADMIN") {
      return NextResponse.json(
        { error: "Samo administratori mogu menjati paket" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { newTier } = body;

    if (!newTier || !isValidTier(newTier)) {
      return NextResponse.json(
        { error: "Nevažeći paket" },
        { status: 400 }
      );
    }

    // Get gym with subscription info
    const gym = await prisma.gym.findUnique({
      where: { id: staff.gymId },
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
      },
    });

    if (!gym) {
      return NextResponse.json(
        { error: "Teretana nije pronađena" },
        { status: 404 }
      );
    }

    // Check if gym has an active subscription
    if (gym.subscriptionStatus !== "active" && gym.subscriptionStatus !== "grace") {
      return NextResponse.json(
        { error: "Nema aktivne pretplate za promenu paketa" },
        { status: 400 }
      );
    }

    if (!gym.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "Nedostaje Stripe pretplata" },
        { status: 400 }
      );
    }

    const currentTier = (gym.subscriptionTier || "starter") as GymTier;

    // Check if already on this tier
    if (currentTier === newTier) {
      return NextResponse.json(
        { error: `Već ste na ${getTierName(newTier)} paketu` },
        { status: 400 }
      );
    }

    const isUpgrade = isTierHigher(newTier, currentTier);

    // Update subscription in Stripe (this will trigger webhook for tier sync)
    await changeSubscriptionTier(gym.stripeSubscriptionId, newTier as GymTier);

    // Immediately update tier in database (webhook will also sync, but this is faster for UX)
    await prisma.gym.update({
      where: { id: gym.id },
      data: { subscriptionTier: newTier },
    });

    // Log the change
    await prisma.subscriptionLog.create({
      data: {
        entityType: "gym",
        entityId: gym.id,
        action: isUpgrade ? "upgraded" : "downgraded",
        notes: `${isUpgrade ? "Upgrade" : "Downgrade"} from ${getTierName(currentTier)} to ${getTierName(newTier)}`,
        performedBy: session.userId,
        performedByType: "staff",
      },
    });

    return NextResponse.json({
      success: true,
      message: isUpgrade
        ? `Uspešno nadogradili paket na ${getTierName(newTier)} (${formatTierPrice(newTier)}/mesec)`
        : `Paket promenjen na ${getTierName(newTier)} (${formatTierPrice(newTier)}/mesec)`,
      previousTier: currentTier,
      newTier,
      isUpgrade,
    });
  } catch (error) {
    console.error("Change tier error:", error);
    return NextResponse.json(
      { error: "Greška pri promeni paketa" },
      { status: 500 }
    );
  }
}

// GET /api/stripe/change-tier - Get current tier and available tiers
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gym = await prisma.gym.findUnique({
      where: { id: session.gymId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
      },
    });

    if (!gym) {
      return NextResponse.json(
        { error: "Teretana nije pronađena" },
        { status: 404 }
      );
    }

    const currentTier = (gym.subscriptionTier || "starter") as GymTier;

    return NextResponse.json({
      currentTier,
      subscriptionStatus: gym.subscriptionStatus,
      availableTiers: [
        {
          tier: "starter",
          name: getTierName("starter"),
          price: formatTierPrice("starter"),
          isCurrent: currentTier === "starter",
          isUpgrade: isTierHigher("starter", currentTier),
        },
        {
          tier: "pro",
          name: getTierName("pro"),
          price: formatTierPrice("pro"),
          isCurrent: currentTier === "pro",
          isUpgrade: isTierHigher("pro", currentTier),
        },
        {
          tier: "elite",
          name: getTierName("elite"),
          price: formatTierPrice("elite"),
          isCurrent: currentTier === "elite",
          isUpgrade: isTierHigher("elite", currentTier),
        },
      ],
    });
  } catch (error) {
    console.error("Get tier info error:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju informacija o paketu" },
      { status: 500 }
    );
  }
}
