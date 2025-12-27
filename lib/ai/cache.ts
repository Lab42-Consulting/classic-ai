// Simple in-memory cache for AI responses
// For production, consider using Redis or a database

interface CacheEntry {
  response: string;
  timestamp: number;
  hits: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Cache for common questions
const responseCache = new Map<string, CacheEntry>();

// Rate limiting per user
const rateLimits = new Map<string, RateLimitEntry>();

// Cache configuration
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_MAX_SIZE = 100;
const RATE_LIMIT_MAX = 30; // messages per day
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

// Normalize query for better cache hits
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[?!.,;:]+$/, "") // Remove trailing punctuation
    .replace(/\s+/g, " "); // Normalize whitespace
}

// Generate cache key from query (simple similarity)
function getCacheKey(query: string): string {
  const normalized = normalizeQuery(query);

  // Check for common question patterns
  const patterns: [RegExp, string][] = [
    [/kako (napredujem|idem|stojim).*nedel/i, "progress_weekly"],
    [/na šta.*fokus/i, "focus_advice"],
    [/(makro|protein|ugljen).*balans/i, "macro_balance"],
    [/zašto.*dosled/i, "consistency_importance"],
    [/how.*(doing|progress).*week/i, "progress_weekly"],
    [/what.*focus/i, "focus_advice"],
    [/macro.*balance/i, "macro_balance"],
    [/why.*consisten/i, "consistency_importance"],
  ];

  for (const [pattern, key] of patterns) {
    if (pattern.test(normalized)) {
      return key;
    }
  }

  // For unique queries, use first 50 chars as key
  return normalized.slice(0, 50);
}

// Check rate limit for user
export function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimits.get(userId);

  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    rateLimits.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

// Get cached response
export function getCachedResponse(query: string): string | null {
  const key = getCacheKey(query);
  const entry = responseCache.get(key);

  if (!entry) return null;

  // Check if expired
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    responseCache.delete(key);
    return null;
  }

  // Update hits
  entry.hits++;
  return entry.response;
}

// Cache a response
export function cacheResponse(query: string, response: string): void {
  const key = getCacheKey(query);

  // Enforce max cache size
  if (responseCache.size >= CACHE_MAX_SIZE) {
    // Remove oldest entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [k, v] of responseCache) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    }

    if (oldestKey) {
      responseCache.delete(oldestKey);
    }
  }

  responseCache.set(key, {
    response,
    timestamp: Date.now(),
    hits: 1,
  });
}

// Get cache stats (for debugging)
export function getCacheStats() {
  return {
    size: responseCache.size,
    entries: Array.from(responseCache.entries()).map(([key, entry]) => ({
      key,
      hits: entry.hits,
      age: Math.round((Date.now() - entry.timestamp) / 1000 / 60), // minutes
    })),
  };
}

// Clear expired entries (run periodically)
export function cleanupCache(): void {
  const now = Date.now();

  for (const [key, entry] of responseCache) {
    if (now - entry.timestamp > CACHE_TTL) {
      responseCache.delete(key);
    }
  }

  for (const [userId, entry] of rateLimits) {
    if (now > entry.resetTime) {
      rateLimits.delete(userId);
    }
  }
}
