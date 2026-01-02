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

// Stripe configuration
export const STRIPE_CONFIG = {
  // Monthly subscription price for gyms (150€)
  GYM_MONTHLY_PRICE: 15000, // in cents
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

// Create a checkout session for gym subscription
export async function createGymCheckoutSession(
  gymId: string,
  gymName: string,
  customerEmail: string
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

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: STRIPE_CONFIG.CURRENCY,
          product_data: {
            name: "Classic Method - Gym Subscription",
            description: `Monthly subscription for ${gymName}`,
          },
          unit_amount: STRIPE_CONFIG.GYM_MONTHLY_PRICE,
          recurring: {
            interval: "month",
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      gymId,
      gymName,
    },
    subscription_data: {
      metadata: {
        gymId,
        gymName,
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
