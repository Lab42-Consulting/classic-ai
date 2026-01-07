/**
 * Gym Subscription Tier Configuration
 *
 * Defines the three subscription tiers available for gyms:
 * - Starter: €99/month - Basic features, limited capacity
 * - Pro: €199/month - Full features, moderate capacity
 * - Elite: €299/month - All features, unlimited capacity
 */

export const GYM_TIERS = {
  starter: {
    name: "Starter",
    nameSerbian: "Starter",
    price: 9900, // cents (€99)
    stripePriceId: process.env.STRIPE_PRICE_STARTER || "",
    limits: {
      maxActiveMembers: 50,
      aiMessagesPerMemberPerDay: 10,
      aiMonthlyBudgetUsd: 5.0,
    },
    features: {
      challenges: false,
      sessionScheduling: false,
      coachFeatures: false,
      customBranding: false,
    },
  },
  pro: {
    name: "Pro",
    nameSerbian: "Pro",
    price: 19900, // cents (€199)
    stripePriceId: process.env.STRIPE_PRICE_PRO || "",
    limits: {
      maxActiveMembers: 150,
      aiMessagesPerMemberPerDay: 25,
      aiMonthlyBudgetUsd: 15.0,
    },
    features: {
      challenges: true,
      sessionScheduling: true,
      coachFeatures: true,
      customBranding: false,
    },
  },
  elite: {
    name: "Elite",
    nameSerbian: "Elite",
    price: 29900, // cents (€299)
    stripePriceId: process.env.STRIPE_PRICE_ELITE || "",
    limits: {
      maxActiveMembers: null, // unlimited
      aiMessagesPerMemberPerDay: 50,
      aiMonthlyBudgetUsd: 50.0,
    },
    features: {
      challenges: true,
      sessionScheduling: true,
      coachFeatures: true,
      customBranding: true,
    },
  },
} as const;

export type GymTier = keyof typeof GYM_TIERS;
export type TierConfig = (typeof GYM_TIERS)[GymTier];
export type TierFeature = keyof TierConfig["features"];
export type TierLimits = TierConfig["limits"];

/**
 * Get the full configuration for a tier
 */
export function getTierConfig(tier: string): TierConfig {
  const validTier = tier as GymTier;
  if (validTier in GYM_TIERS) {
    return GYM_TIERS[validTier];
  }
  // Default to starter for invalid tiers
  return GYM_TIERS.starter;
}

/**
 * Check if a feature is enabled for a tier
 */
export function isFeatureEnabled(tier: string, feature: TierFeature): boolean {
  return getTierConfig(tier).features[feature];
}

/**
 * Get the limits for a tier
 */
export function getTierLimits(tier: string): TierLimits {
  return getTierConfig(tier).limits;
}

/**
 * Get the display name for a tier
 */
export function getTierName(tier: string, serbian = false): string {
  const config = getTierConfig(tier);
  return serbian ? config.nameSerbian : config.name;
}

/**
 * Get the price for a tier in cents
 */
export function getTierPrice(tier: string): number {
  return getTierConfig(tier).price;
}

/**
 * Get the Stripe price ID for a tier
 */
export function getTierStripePriceId(tier: string): string {
  return getTierConfig(tier).stripePriceId;
}

/**
 * Check if tier A is higher than tier B
 */
export function isTierHigher(tierA: string, tierB: string): boolean {
  const tierOrder: GymTier[] = ["starter", "pro", "elite"];
  const indexA = tierOrder.indexOf(tierA as GymTier);
  const indexB = tierOrder.indexOf(tierB as GymTier);
  return indexA > indexB;
}

/**
 * Get the minimum tier required for a feature
 */
export function getRequiredTierForFeature(feature: TierFeature): GymTier {
  const tierOrder: GymTier[] = ["starter", "pro", "elite"];
  for (const tier of tierOrder) {
    if (GYM_TIERS[tier].features[feature]) {
      return tier;
    }
  }
  return "elite"; // Fallback - feature requires highest tier
}

/**
 * Get all tiers as an array for iteration
 */
export function getAllTiers(): GymTier[] {
  return ["starter", "pro", "elite"];
}

/**
 * Format price for display (e.g., "€99")
 */
export function formatTierPrice(tier: string): string {
  const price = getTierPrice(tier) / 100;
  return `€${price}`;
}

/**
 * Check if a string is a valid tier
 */
export function isValidTier(tier: string): tier is GymTier {
  return tier in GYM_TIERS;
}
