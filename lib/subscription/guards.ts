/**
 * Feature Gating Helpers for Tiered Subscriptions
 *
 * Provides functions to check if a gym has access to specific features
 * based on their subscription tier.
 */

import prisma from "@/lib/db";
import {
  getTierConfig,
  isFeatureEnabled,
  getRequiredTierForFeature,
  getTierName,
  type GymTier,
  type TierFeature,
} from "./tiers";

export interface FeatureCheckResult {
  allowed: boolean;
  tier: GymTier;
  requiredTier?: GymTier;
  error?: string;
}

export interface CapacityCheckResult {
  allowed: boolean;
  current: number;
  limit: number | null;
  tier: GymTier;
  error?: string;
}

/**
 * Check if a gym has access to a specific feature
 */
export async function checkFeatureAccess(
  gymId: string,
  feature: TierFeature
): Promise<FeatureCheckResult> {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { subscriptionTier: true, subscriptionStatus: true },
  });

  if (!gym) {
    return {
      allowed: false,
      tier: "starter",
      error: "Teretana nije pronađena",
    };
  }

  // Check if subscription is active
  if (gym.subscriptionStatus !== "active" && gym.subscriptionStatus !== "grace") {
    return {
      allowed: false,
      tier: (gym.subscriptionTier || "starter") as GymTier,
      error: "Pretplata nije aktivna",
    };
  }

  const tier = (gym.subscriptionTier || "starter") as GymTier;
  const allowed = isFeatureEnabled(tier, feature);

  if (!allowed) {
    const requiredTier = getRequiredTierForFeature(feature);
    return {
      allowed: false,
      tier,
      requiredTier,
      error: `Ova funkcija zahteva ${getTierName(requiredTier)} paket`,
    };
  }

  return { allowed: true, tier };
}

/**
 * Check if gym can add more active members
 */
export async function checkMemberCapacity(gymId: string): Promise<CapacityCheckResult> {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { subscriptionTier: true },
  });

  const tier = (gym?.subscriptionTier || "starter") as GymTier;
  const limits = getTierConfig(tier).limits;

  const activeMembers = await prisma.member.count({
    where: { gymId, status: "active" },
  });

  const limit = limits.maxActiveMembers;
  const allowed = limit === null || activeMembers < limit;

  if (!allowed) {
    return {
      allowed: false,
      current: activeMembers,
      limit,
      tier,
      error: `Dostignut limit članova. ${getTierName(tier)} paket dozvoljava ${limit} članova. Nadogradite za više.`,
    };
  }

  return { allowed: true, current: activeMembers, limit, tier };
}

/**
 * Get AI rate limit for member based on gym's tier
 * Returns the number of messages per day allowed
 */
export function getAiRateLimitForTier(
  gymTier: string,
  memberSubscriptionStatus: string
): number {
  // Expired or cancelled members get no access
  if (
    memberSubscriptionStatus === "expired" ||
    memberSubscriptionStatus === "cancelled"
  ) {
    return 0;
  }

  const config = getTierConfig(gymTier);

  // Trial members get reduced limit (min 5 or tier limit)
  if (memberSubscriptionStatus === "trial") {
    return Math.min(5, config.limits.aiMessagesPerMemberPerDay);
  }

  return config.limits.aiMessagesPerMemberPerDay;
}

/**
 * Get the gym tier for a member
 * Convenience function to fetch gym tier from member ID
 */
export async function getGymTierForMember(memberId: string): Promise<GymTier> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      gym: {
        select: { subscriptionTier: true },
      },
    },
  });

  return (member?.gym?.subscriptionTier || "starter") as GymTier;
}

/**
 * Check multiple features at once
 * Returns true only if ALL features are allowed
 */
export async function checkMultipleFeatures(
  gymId: string,
  features: TierFeature[]
): Promise<FeatureCheckResult> {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { subscriptionTier: true, subscriptionStatus: true },
  });

  if (!gym) {
    return {
      allowed: false,
      tier: "starter",
      error: "Teretana nije pronađena",
    };
  }

  if (gym.subscriptionStatus !== "active" && gym.subscriptionStatus !== "grace") {
    return {
      allowed: false,
      tier: (gym.subscriptionTier || "starter") as GymTier,
      error: "Pretplata nije aktivna",
    };
  }

  const tier = (gym.subscriptionTier || "starter") as GymTier;

  for (const feature of features) {
    if (!isFeatureEnabled(tier, feature)) {
      const requiredTier = getRequiredTierForFeature(feature);
      return {
        allowed: false,
        tier,
        requiredTier,
        error: `Ova funkcija zahteva ${getTierName(requiredTier)} paket`,
      };
    }
  }

  return { allowed: true, tier };
}

/**
 * Get tier info for a gym (for display purposes)
 */
export async function getGymTierInfo(gymId: string): Promise<{
  tier: GymTier;
  tierName: string;
  limits: ReturnType<typeof getTierConfig>["limits"];
  features: ReturnType<typeof getTierConfig>["features"];
  memberCount: number;
  memberCapacityUsed: number; // percentage 0-100
}> {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { subscriptionTier: true },
  });

  const tier = (gym?.subscriptionTier || "starter") as GymTier;
  const config = getTierConfig(tier);

  const memberCount = await prisma.member.count({
    where: { gymId, status: "active" },
  });

  const memberCapacityUsed =
    config.limits.maxActiveMembers === null
      ? 0 // Unlimited
      : Math.round((memberCount / config.limits.maxActiveMembers) * 100);

  return {
    tier,
    tierName: getTierName(tier),
    limits: config.limits,
    features: config.features,
    memberCount,
    memberCapacityUsed,
  };
}
