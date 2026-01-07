import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createGymCheckoutSession, type GymTier } from "@/lib/stripe";
import { isValidTier } from "@/lib/subscription/tiers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gymId, tier = "starter" } = body;

    if (!gymId) {
      return NextResponse.json(
        { error: "Gym ID is required" },
        { status: 400 }
      );
    }

    // Validate tier
    if (!isValidTier(tier)) {
      return NextResponse.json(
        { error: "Invalid subscription tier" },
        { status: 400 }
      );
    }

    // Get gym details
    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      include: {
        staff: {
          where: { role: "ADMIN" },
          take: 1,
        },
      },
    });

    if (!gym) {
      return NextResponse.json(
        { error: "Teretana nije pronađena" },
        { status: 404 }
      );
    }

    if (!gym.ownerEmail) {
      return NextResponse.json(
        { error: "Email vlasnika nije podešen" },
        { status: 400 }
      );
    }

    // Check if gym already has an active subscription
    if (gym.subscriptionStatus === "active") {
      return NextResponse.json(
        { error: "Teretana već ima aktivnu pretplatu" },
        { status: 400 }
      );
    }

    // Create Stripe checkout session with selected tier
    const session = await createGymCheckoutSession(
      gym.id,
      gym.name,
      gym.ownerEmail,
      tier as GymTier
    );

    // Update gym with Stripe customer ID if available
    if (session.customer) {
      await prisma.gym.update({
        where: { id: gym.id },
        data: {
          stripeCustomerId: session.customer as string,
        },
      });
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      gym: {
        id: gym.id,
        name: gym.name,
        ownerEmail: gym.ownerEmail,
      },
    });
  } catch (error) {
    console.error("Create checkout error:", error);
    return NextResponse.json(
      { error: "Greška pri kreiranju sesije za plaćanje" },
      { status: 500 }
    );
  }
}
