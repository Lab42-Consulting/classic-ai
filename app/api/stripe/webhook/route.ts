import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature, getSubscriptionEndDate, STRIPE_CONFIG, getTierPricing } from "@/lib/stripe";
import { isValidTier, type GymTier } from "@/lib/subscription/tiers";
import Stripe from "stripe";

// Disable body parsing for raw webhook payload
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(payload, signature);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// Handle successful checkout session
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const gymId = session.metadata?.gymId;
  if (!gymId) {
    console.error("No gymId in checkout session metadata");
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  // Get tier from metadata, default to "starter" for backwards compatibility
  const tierFromMetadata = session.metadata?.tier;
  const tier: GymTier = tierFromMetadata && isValidTier(tierFromMetadata) ? tierFromMetadata : "starter";
  const tierPricing = getTierPricing(tier);

  // Update gym with subscription details and tier
  await prisma.gym.update({
    where: { id: gymId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: "active",
      subscriptionTier: tier,
      subscribedAt: new Date(),
      // Initial subscription end date will be set by invoice.paid event
    },
  });

  // Log the activation with tier info
  await prisma.subscriptionLog.create({
    data: {
      entityType: "gym",
      entityId: gymId,
      action: "activated",
      amount: tierPricing.price / 100,
      notes: `Subscription activated via Stripe checkout - ${tier.toUpperCase()} tier`,
      performedByType: "stripe",
    },
  });

  console.log(`Gym ${gymId} subscription activated with tier: ${tier}`);
}

// Handle successful invoice payment (subscription renewal)
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Get subscription ID - can be string or Subscription object
  const subscriptionId = typeof invoice.parent?.subscription_details?.subscription === "string"
    ? invoice.parent.subscription_details.subscription
    : invoice.parent?.subscription_details?.subscription?.id;
  if (!subscriptionId) return;

  // Find gym by subscription ID
  const gym = await prisma.gym.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!gym) {
    console.error(`No gym found for subscription ${subscriptionId}`);
    return;
  }

  // Get subscription details to get the period end
  const stripe = new (await import("stripe")).default(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-12-15.clover",
  });

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const endDate = getSubscriptionEndDate(subscription);

  const previousEndDate = gym.subscribedUntil;

  // Update gym subscription
  await prisma.gym.update({
    where: { id: gym.id },
    data: {
      subscriptionStatus: "active",
      subscribedUntil: endDate,
    },
  });

  // Log the payment
  await prisma.subscriptionLog.create({
    data: {
      entityType: "gym",
      entityId: gym.id,
      action: "payment_received",
      previousEndDate,
      newEndDate: endDate,
      months: 1,
      amount: (invoice.amount_paid || 0) / 100,
      notes: `Invoice ${invoice.id} paid`,
      performedByType: "stripe",
    },
  });

  console.log(`Gym ${gym.id} subscription extended to ${endDate}`);
}

// Handle failed payment
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Get subscription ID - can be string or Subscription object
  const subscriptionId = typeof invoice.parent?.subscription_details?.subscription === "string"
    ? invoice.parent.subscription_details.subscription
    : invoice.parent?.subscription_details?.subscription?.id;
  if (!subscriptionId) return;

  // Find gym by subscription ID
  const gym = await prisma.gym.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!gym) {
    console.error(`No gym found for subscription ${subscriptionId}`);
    return;
  }

  // Set gym to grace period status
  await prisma.gym.update({
    where: { id: gym.id },
    data: {
      subscriptionStatus: "grace",
    },
  });

  // Log the failed payment
  await prisma.subscriptionLog.create({
    data: {
      entityType: "gym",
      entityId: gym.id,
      action: "grace_started",
      notes: `Payment failed for invoice ${invoice.id}. Grace period started.`,
      performedByType: "stripe",
    },
  });

  console.log(`Gym ${gym.id} entered grace period due to failed payment`);
}

// Handle subscription deleted/cancelled
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const gymId = subscription.metadata?.gymId;

  // Find gym by subscription ID if not in metadata
  const gym = gymId
    ? await prisma.gym.findUnique({ where: { id: gymId } })
    : await prisma.gym.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });

  if (!gym) {
    console.error(`No gym found for subscription ${subscription.id}`);
    return;
  }

  // Update gym status to expired
  await prisma.gym.update({
    where: { id: gym.id },
    data: {
      subscriptionStatus: "expired",
    },
  });

  // Log the cancellation
  await prisma.subscriptionLog.create({
    data: {
      entityType: "gym",
      entityId: gym.id,
      action: "expired",
      notes: "Subscription cancelled/deleted in Stripe",
      performedByType: "stripe",
    },
  });

  console.log(`Gym ${gym.id} subscription expired`);
}

// Handle subscription updates (e.g., plan changes, tier changes, cancellation scheduled)
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const gym = await prisma.gym.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!gym) return;

  // Check if subscription is set to cancel at period end
  if (subscription.cancel_at_period_end) {
    console.log(`Gym ${gym.id} subscription will cancel at period end`);
  }

  // Check for tier change from subscription metadata
  const tierFromMetadata = subscription.metadata?.tier;
  const newTier: GymTier | null = tierFromMetadata && isValidTier(tierFromMetadata) ? tierFromMetadata : null;

  // Update subscription end date and tier if changed
  const endDate = getSubscriptionEndDate(subscription);
  const updates: {
    subscribedUntil?: Date;
    subscriptionTier?: string;
  } = {};

  if (!gym.subscribedUntil || gym.subscribedUntil.getTime() !== endDate.getTime()) {
    updates.subscribedUntil = endDate;
  }

  if (newTier && gym.subscriptionTier !== newTier) {
    updates.subscriptionTier = newTier;
    console.log(`Gym ${gym.id} tier changed from ${gym.subscriptionTier} to ${newTier}`);

    // Log the tier change
    await prisma.subscriptionLog.create({
      data: {
        entityType: "gym",
        entityId: gym.id,
        action: "tier_changed",
        notes: `Tier changed from ${gym.subscriptionTier?.toUpperCase()} to ${newTier.toUpperCase()}`,
        performedByType: "stripe",
      },
    });
  }

  if (Object.keys(updates).length > 0) {
    await prisma.gym.update({
      where: { id: gym.id },
      data: updates,
    });
  }
}
