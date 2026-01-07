// Database-backed cache for AI responses
// Provides persistent caching and rate limiting

import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getAiRateLimitForTier } from "@/lib/subscription/guards";

// Cache configuration
const CACHE_TTL_DAYS = 7; // Cache responses for 7 days
const CACHE_MAX_SIZE = 500; // Max cached responses

// Legacy rate limits by subscription status (used when gym tier is not provided)
// For tier-aware rate limiting, use getAiRateLimitForTier() instead
const RATE_LIMITS = {
  trial: 5, // Trial users: 5 messages/day
  active: 20, // Active members: 20 messages/day (legacy - now tier-based)
  expired: 0, // Expired: no access
  cancelled: 0, // Cancelled: no access
} as const;

// Haiku pricing (as of 2024)
const HAIKU_COST_PER_1K_INPUT = 0.00025; // $0.25 per 1M input tokens
const HAIKU_COST_PER_1K_OUTPUT = 0.00125; // $1.25 per 1M output tokens

type SubscriptionStatus = keyof typeof RATE_LIMITS;

// Normalize query for better cache hits
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[?!.,;:]+$/, "") // Remove trailing punctuation
    .replace(/\s+/g, " "); // Normalize whitespace
}

// Generate cache key from query (pattern matching for common questions)
export function getCacheKey(query: string): string {
  const normalized = normalizeQuery(query);

  // Check for common question patterns (Serbian and English)
  const patterns: [RegExp, string][] = [
    // Progress questions
    [/kako (napredujem|idem|stojim)/i, "progress_general"],
    [/how.*(doing|progress)/i, "progress_general"],

    // Focus/priority questions
    [/na šta.*fokus/i, "focus_advice"],
    [/šta.*prioritet/i, "focus_advice"],
    [/what.*focus/i, "focus_advice"],

    // Macro/nutrition questions
    [/(makro|protein|ugljen).*balans/i, "macro_balance"],
    [/macro.*balance/i, "macro_balance"],
    [/is my macro/i, "macro_balance"],

    // Consistency questions
    [/zašto.*dosled/i, "consistency_importance"],
    [/why.*consisten/i, "consistency_importance"],

    // Tiredness/energy
    [/zašto.*(umor|umoran)/i, "tiredness_advice"],
    [/why.*(tired|fatigue)/i, "tiredness_advice"],

    // Supplements
    [/(suplement|dodatak)/i, "supplements_general"],
    [/should.*supplement/i, "supplements_general"],

    // Slow progress
    [/(spor|polako).*napred/i, "slow_progress"],
    [/progress.*slow/i, "slow_progress"],
    [/why.*slow/i, "slow_progress"],
  ];

  for (const [pattern, key] of patterns) {
    if (pattern.test(normalized)) {
      return key;
    }
  }

  // For unique queries, use first 100 chars as key
  return `custom_${normalized.slice(0, 100)}`;
}

// Check rate limit for user (database-backed)
export async function checkRateLimit(
  memberId: string,
  subscriptionStatus: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const status = subscriptionStatus as SubscriptionStatus;
  const limit = RATE_LIMITS[status] ?? 0;

  if (limit === 0) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get or create today's usage record
  const usage = await prisma.aIUsageDaily.upsert({
    where: {
      memberId_date: {
        memberId,
        date: today,
      },
    },
    create: {
      memberId,
      date: today,
      count: 0,
    },
    update: {},
  });

  const remaining = Math.max(0, limit - usage.count);
  return {
    allowed: usage.count < limit,
    remaining,
    limit,
  };
}

// Increment usage count for a member
export async function incrementUsage(memberId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.aIUsageDaily.upsert({
    where: {
      memberId_date: {
        memberId,
        date: today,
      },
    },
    create: {
      memberId,
      date: today,
      count: 1,
    },
    update: {
      count: { increment: 1 },
    },
  });
}

/**
 * Atomic check and increment rate limit
 * This prevents race conditions where concurrent requests could exceed the limit.
 *
 * Strategy: Increment first, then check. If over limit, decrement and reject.
 * This is safer than check-then-increment which has a TOCTOU vulnerability.
 *
 * @param memberId - The member's ID
 * @param subscriptionStatus - Member's subscription status
 * @returns Whether the request is allowed and usage info
 */
export async function checkAndIncrementRateLimit(
  memberId: string,
  subscriptionStatus: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const status = subscriptionStatus as SubscriptionStatus;
  const limit = RATE_LIMITS[status] ?? 0;

  if (limit === 0) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Use transaction with Serializable isolation to prevent race conditions
  const result = await prisma.$transaction(
    async (tx) => {
      // Increment first (atomic upsert)
      const usage = await tx.aIUsageDaily.upsert({
        where: {
          memberId_date: {
            memberId,
            date: today,
          },
        },
        create: {
          memberId,
          date: today,
          count: 1,
        },
        update: {
          count: { increment: 1 },
        },
      });

      // Check if we exceeded the limit
      if (usage.count > limit) {
        // Roll back the increment
        await tx.aIUsageDaily.update({
          where: {
            memberId_date: {
              memberId,
              date: today,
            },
          },
          data: {
            count: { decrement: 1 },
          },
        });

        return {
          allowed: false,
          remaining: 0,
          limit,
        };
      }

      // Request allowed
      return {
        allowed: true,
        remaining: Math.max(0, limit - usage.count),
        limit,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 5000,
    }
  );

  return result;
}

/**
 * Tier-aware check and increment rate limit
 * Uses the gym's subscription tier to determine the rate limit.
 *
 * @param memberId - The member's ID
 * @param subscriptionStatus - Member's subscription status
 * @param gymTier - The gym's subscription tier (starter, pro, elite)
 * @returns Whether the request is allowed and usage info
 */
export async function checkAndIncrementRateLimitWithTier(
  memberId: string,
  subscriptionStatus: string,
  gymTier: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  // Get tier-aware limit
  const limit = getAiRateLimitForTier(gymTier, subscriptionStatus);

  if (limit === 0) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Use transaction with Serializable isolation to prevent race conditions
  const result = await prisma.$transaction(
    async (tx) => {
      // Increment first (atomic upsert)
      const usage = await tx.aIUsageDaily.upsert({
        where: {
          memberId_date: {
            memberId,
            date: today,
          },
        },
        create: {
          memberId,
          date: today,
          count: 1,
        },
        update: {
          count: { increment: 1 },
        },
      });

      // Check if we exceeded the limit
      if (usage.count > limit) {
        // Roll back the increment
        await tx.aIUsageDaily.update({
          where: {
            memberId_date: {
              memberId,
              date: today,
            },
          },
          data: {
            count: { decrement: 1 },
          },
        });

        return {
          allowed: false,
          remaining: 0,
          limit,
        };
      }

      // Request allowed
      return {
        allowed: true,
        remaining: Math.max(0, limit - usage.count),
        limit,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 5000,
    }
  );

  return result;
}

/**
 * Decrement usage count (rollback for failed AI requests)
 * Use this to restore quota if the AI request fails after rate limit was consumed.
 *
 * @param memberId - The member's ID
 */
export async function decrementUsage(memberId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    await prisma.aIUsageDaily.update({
      where: {
        memberId_date: {
          memberId,
          date: today,
        },
      },
      data: {
        count: { decrement: 1 },
      },
    });
  } catch {
    // If record doesn't exist, nothing to decrement
  }
}

// Get cached response from database
export async function getCachedResponse(query: string): Promise<string | null> {
  const key = getCacheKey(query);

  const cached = await prisma.aIResponseCache.findUnique({
    where: { cacheKey: key },
  });

  if (!cached) return null;

  // Check if expired (older than TTL)
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - CACHE_TTL_DAYS);

  if (cached.createdAt < expiryDate) {
    // Delete expired entry
    await prisma.aIResponseCache.delete({ where: { id: cached.id } });
    return null;
  }

  // Update hit count and last used
  await prisma.aIResponseCache.update({
    where: { id: cached.id },
    data: {
      hits: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });

  return cached.response;
}

// Cache a response in the database
export async function cacheResponse(query: string, response: string): Promise<void> {
  const key = getCacheKey(query);

  // Don't cache custom/unique queries (they start with "custom_")
  if (key.startsWith("custom_")) {
    return;
  }

  try {
    await prisma.aIResponseCache.upsert({
      where: { cacheKey: key },
      create: {
        cacheKey: key,
        query,
        response,
        hits: 1,
      },
      update: {
        response,
        lastUsedAt: new Date(),
        hits: { increment: 1 },
      },
    });

    // Enforce max cache size by removing least recently used entries
    const count = await prisma.aIResponseCache.count();
    if (count > CACHE_MAX_SIZE) {
      const toDelete = count - CACHE_MAX_SIZE;
      const oldEntries = await prisma.aIResponseCache.findMany({
        orderBy: { lastUsedAt: "asc" },
        take: toDelete,
        select: { id: true },
      });

      await prisma.aIResponseCache.deleteMany({
        where: { id: { in: oldEntries.map((e) => e.id) } },
      });
    }
  } catch (error) {
    // Log but don't fail on cache errors
    console.error("Cache write error:", error);
  }
}

// Check gym's monthly budget cap
export async function checkGymBudget(
  gymId: string
): Promise<{ allowed: boolean; remaining: number | null; budgetUsd: number | null }> {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { aiMonthlyBudget: true },
  });

  // No budget cap set = unlimited
  if (!gym?.aiMonthlyBudget) {
    return { allowed: true, remaining: null, budgetUsd: null };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const usage = await prisma.aIUsageMonthly.findUnique({
    where: {
      gymId_year_month: { gymId, year, month },
    },
  });

  const currentCost = usage?.estimatedCostUsd ?? 0;
  const remaining = gym.aiMonthlyBudget - currentCost;

  return {
    allowed: remaining > 0,
    remaining,
    budgetUsd: gym.aiMonthlyBudget,
  };
}

// Track AI usage and costs for a gym
export async function trackAIUsage(
  gymId: string,
  tokensIn: number,
  tokensOut: number
): Promise<void> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const costIn = (tokensIn / 1000) * HAIKU_COST_PER_1K_INPUT;
  const costOut = (tokensOut / 1000) * HAIKU_COST_PER_1K_OUTPUT;
  const totalCost = costIn + costOut;

  await prisma.aIUsageMonthly.upsert({
    where: {
      gymId_year_month: { gymId, year, month },
    },
    create: {
      gymId,
      year,
      month,
      totalRequests: 1,
      totalTokensIn: tokensIn,
      totalTokensOut: tokensOut,
      estimatedCostUsd: totalCost,
    },
    update: {
      totalRequests: { increment: 1 },
      totalTokensIn: { increment: tokensIn },
      totalTokensOut: { increment: tokensOut },
      estimatedCostUsd: { increment: totalCost },
    },
  });
}

// Get cache statistics
export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalHits: number;
  topQueries: Array<{ cacheKey: string; hits: number }>;
}> {
  const entries = await prisma.aIResponseCache.findMany({
    select: { cacheKey: true, hits: true },
    orderBy: { hits: "desc" },
    take: 10,
  });

  const totalHits = entries.reduce((sum, e) => sum + e.hits, 0);

  return {
    totalEntries: await prisma.aIResponseCache.count(),
    totalHits,
    topQueries: entries,
  };
}

// Cleanup old cache entries and usage records
export async function cleanupOldData(): Promise<{
  deletedCacheEntries: number;
  deletedUsageRecords: number;
}> {
  const cacheExpiry = new Date();
  cacheExpiry.setDate(cacheExpiry.getDate() - CACHE_TTL_DAYS);

  const usageExpiry = new Date();
  usageExpiry.setDate(usageExpiry.getDate() - 30); // Keep 30 days of usage data

  const [cacheResult, usageResult] = await Promise.all([
    prisma.aIResponseCache.deleteMany({
      where: { createdAt: { lt: cacheExpiry } },
    }),
    prisma.aIUsageDaily.deleteMany({
      where: { date: { lt: usageExpiry } },
    }),
  ]);

  return {
    deletedCacheEntries: cacheResult.count,
    deletedUsageRecords: usageResult.count,
  };
}

// Pre-seed cache with responses for suggested prompts
export async function seedCacheIfEmpty(
  generateResponse: (query: string) => Promise<string>
): Promise<number> {
  const suggestedPrompts = [
    "Why is my progress slow?",
    "What should I focus on this week?",
    "Is my macro balance okay?",
    "Why do I feel tired?",
    "Should I consider supplements?",
  ];

  let seededCount = 0;

  for (const prompt of suggestedPrompts) {
    const key = getCacheKey(prompt);

    // Skip if already cached
    const existing = await prisma.aIResponseCache.findUnique({
      where: { cacheKey: key },
    });

    if (!existing) {
      try {
        const response = await generateResponse(prompt);
        await prisma.aIResponseCache.create({
          data: {
            cacheKey: key,
            query: prompt,
            response,
            hits: 0,
          },
        });
        seededCount++;
      } catch (error) {
        console.error(`Failed to seed cache for: ${prompt}`, error);
      }
    }
  }

  return seededCount;
}
