import Stripe from "stripe";

// Lazy-loaded Stripe client to avoid build-time failures
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    });
  }
  return stripeInstance;
}

// Export stripe getter for use in API routes
export { getStripe };

// For backwards compatibility (will throw if used without key)
export const stripe = {
  get customers() { return getStripe().customers; },
  get subscriptions() { return getStripe().subscriptions; },
  get checkout() { return getStripe().checkout; },
  get webhooks() { return getStripe().webhooks; },
  get prices() { return getStripe().prices; },
  get billingPortal() { return getStripe().billingPortal; },
};

// Import tier configuration
import { GYM_TIERS, type GymTier } from "@/lib/subscription/tiers";

// Stripe configuration
export const STRIPE_CONFIG = {
  // Legacy price (kept for backwards compatibility with existing subscriptions)
  GYM_MONTHLY_PRICE: 15000, // in cents (€150)
  CURRENCY: "eur",

  // Grace period for failed payments (in days)
  GRACE_PERIOD_DAYS: 7,

  // URLs for checkout redirect
  getSuccessUrl: (gymId: string) =>
    `${process.env.NEXT_PUBLIC_APP_URL}/gym-portal/success?gymId=${gymId}`,
  getCancelUrl: (gymId: string) =>
    `${process.env.NEXT_PUBLIC_APP_URL}/gym-portal/checkout?gymId=${gymId}&cancelled=true`,

  // Webhook endpoint URL (for reference)
  WEBHOOK_ENDPOINT: "/api/stripe/webhook",
};

// Get tier price configuration
export function getTierPricing(tier: GymTier): {
  price: number;
  name: string;
  description: string;
} {
  const config = GYM_TIERS[tier];
  return {
    price: config.price,
    name: `Classic Method - ${config.name}`,
    description: `${config.name} monthly subscription`,
  };
}

// Get Stripe price ID for tier (if using pre-created prices)
// Falls back to dynamic pricing if env vars not set
export function getStripePriceId(tier: GymTier): string | null {
  const envKeys: Record<GymTier, string> = {
    starter: "STRIPE_PRICE_STARTER",
    pro: "STRIPE_PRICE_PRO",
    elite: "STRIPE_PRICE_ELITE",
  };
  return process.env[envKeys[tier]] || null;
}

// Create a checkout session for gym subscription
export async function createGymCheckoutSession(
  gymId: string,
  gymName: string,
  customerEmail: string,
  tier: GymTier = "starter"
): Promise<Stripe.Checkout.Session> {
  // First, find or create a Stripe customer
  let customer: Stripe.Customer;

  const existingCustomers = await stripe.customers.list({
    email: customerEmail,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    customer = existingCustomers.data[0];
  } else {
    customer = await stripe.customers.create({
      email: customerEmail,
      metadata: {
        gymId,
        gymName,
      },
    });
  }

  // Get tier pricing
  const pricing = getTierPricing(tier);
  const priceId = getStripePriceId(tier);

  // Build line items - use pre-created price if available, otherwise dynamic pricing
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
    ? [{ price: priceId, quantity: 1 }]
    : [
        {
          price_data: {
            currency: STRIPE_CONFIG.CURRENCY,
            product_data: {
              name: pricing.name,
              description: `${pricing.description} for ${gymName}`,
            },
            unit_amount: pricing.price,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ];

  // Create checkout session with tier in metadata
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: lineItems,
    metadata: {
      gymId,
      gymName,
      tier, // Store tier for webhook processing
    },
    subscription_data: {
      metadata: {
        gymId,
        gymName,
        tier,
      },
    },
    success_url: STRIPE_CONFIG.getSuccessUrl(gymId),
    cancel_url: STRIPE_CONFIG.getCancelUrl(gymId),
    allow_promotion_codes: true,
    billing_address_collection: "required",
  });

  return session;
}

// Create a customer portal session for managing subscription
export async function createCustomerPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return session;
}

// Get subscription details
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }
}

// Cancel a subscription
export async function cancelSubscription(
  subscriptionId: string,
  immediately = false
): Promise<Stripe.Subscription> {
  if (immediately) {
    return await stripe.subscriptions.cancel(subscriptionId);
  }

  // Cancel at period end
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

// Reactivate a cancelled subscription
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

// Helper to calculate subscription end date from Stripe subscription
export function getSubscriptionEndDate(subscription: Stripe.Subscription): Date {
  // Access current_period_end through the items (Stripe API v2025+)
  const item = subscription.items?.data[0];
  if (item?.current_period_end) {
    return new Date(item.current_period_end * 1000);
  }
  // Fallback: use a type assertion for older API compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const periodEnd = (subscription as any).current_period_end;
  if (periodEnd) {
    return new Date(periodEnd * 1000);
  }
  // Default to 30 days from now if we can't determine
  const now = new Date();
  now.setDate(now.getDate() + 30);
  return now;
}

// Helper to check if subscription is in grace period
export function isInGracePeriod(subscribedUntil: Date | null): boolean {
  if (!subscribedUntil) return false;

  const now = new Date();
  const graceEnd = new Date(subscribedUntil);
  graceEnd.setDate(graceEnd.getDate() + STRIPE_CONFIG.GRACE_PERIOD_DAYS);

  return now > subscribedUntil && now <= graceEnd;
}

// Helper to check if subscription is expired (past grace period)
export function isExpired(subscribedUntil: Date | null): boolean {
  if (!subscribedUntil) return true;

  const now = new Date();
  const graceEnd = new Date(subscribedUntil);
  graceEnd.setDate(graceEnd.getDate() + STRIPE_CONFIG.GRACE_PERIOD_DAYS);

  return now > graceEnd;
}

// Change subscription tier (upgrade or downgrade)
// Returns the updated subscription with proration applied
export async function changeSubscriptionTier(
  subscriptionId: string,
  newTier: GymTier
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (!subscription.items.data[0]) {
    throw new Error("Subscription has no items");
  }

  const itemId = subscription.items.data[0].id;
  const priceId = getStripePriceId(newTier);
  const pricing = getTierPricing(newTier);

  // Update subscription with new price
  // proration_behavior: "create_prorations" charges/credits immediately for tier changes
  if (priceId) {
    // Use pre-created Stripe price
    return await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: "create_prorations",
      metadata: {
        ...subscription.metadata,
        tier: newTier,
      },
    });
  } else {
    // Use dynamic pricing - need to delete old item and add new one
    return await stripe.subscriptions.update(subscriptionId, {
      items: [
        { id: itemId, deleted: true },
        {
          price_data: {
            currency: STRIPE_CONFIG.CURRENCY,
            product: subscription.items.data[0].price.product as string,
            unit_amount: pricing.price,
            recurring: { interval: "month" },
          },
        },
      ],
      proration_behavior: "create_prorations",
      metadata: {
        ...subscription.metadata,
        tier: newTier,
      },
    });
  }
}

// Re-export GymTier for convenience
export type { GymTier };
