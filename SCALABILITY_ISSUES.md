# Scalability Issues - Classic Method Gym Intelligence System

**Document Version:** 1.0
**Created:** January 2026
**Target Scale:** 10+ gyms, 3,000-4,000 concurrent users
**Deployment Platform:** Vercel (Serverless)

---

## Executive Summary

This document outlines critical scalability blockers that prevent the application from serving 10+ gyms with 300-400 members each (3,000-4,000 concurrent users) on Vercel's serverless infrastructure.

**Current Realistic Capacity:** ~100-200 concurrent users
**Target Capacity:** 3,000-4,000 concurrent users
**Gap:** 20-40x improvement needed

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
   - [1.1 Missing Database Connection Pooling](#11-missing-database-connection-pooling)
   - [1.2 Coach Dashboard N+1 Query Problem](#12-coach-dashboard-n1-query-problem)
   - [1.3 Base64 Images Stored in Database](#13-base64-images-stored-in-database)
2. [High Severity Issues](#2-high-severity-issues)
   - [2.1 Challenge Points Race Condition](#21-challenge-points-race-condition)
   - [2.2 AI Rate Limiting Race Condition](#22-ai-rate-limiting-race-condition)
3. [Medium Severity Issues](#3-medium-severity-issues)
   - [3.1 Session Validation Database Overhead](#31-session-validation-database-overhead)
   - [3.2 Missing Request Body Size Limits](#32-missing-request-body-size-limits)
   - [3.3 Synchronous Cache Cleanup](#33-synchronous-cache-cleanup)
   - [3.4 Missing Pagination Defaults](#34-missing-pagination-defaults)
4. [Impact Analysis](#4-impact-analysis)
5. [Recommended Solutions](#5-recommended-solutions)

---

## 1. Critical Issues

### 1.1 Missing Database Connection Pooling

**Severity:** CRITICAL
**File:** `lib/db/index.ts`
**Impact:** Application will crash under load

#### Current Implementation

```typescript
// lib/db/index.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

#### Why This Is a Problem

**Vercel Serverless Architecture:**
- Each API route runs in an isolated serverless function
- Functions can scale to thousands of concurrent instances
- Each instance creates its own database connection
- PostgreSQL has a hard connection limit (typically 100-200)

**Concrete Example:**

```
Scenario: 500 users load the app simultaneously

1. User A requests /api/member/profile → Function instance 1 → New DB connection
2. User B requests /api/logs → Function instance 2 → New DB connection
3. User C requests /api/coach/dashboard → Function instance 3 → New DB connection
...
500. User requests any API → Function instance 500 → Connection REFUSED

PostgreSQL Error: "too many connections for role 'user'"
```

**What Happens:**
- First 100-200 requests succeed
- Subsequent requests fail with connection errors
- Application appears "down" to most users
- Database server becomes unresponsive
- Even admin cannot access the system

#### Real-World Failure Mode

```
Timeline of Failure (Monday 9:00 AM - Gym Opens):

09:00 - 50 members open app → 50 connections → OK
09:01 - 100 more members check in → 150 connections → Warning
09:02 - Coaches open dashboards → 200 connections → LIMIT REACHED
09:03 - New requests fail → "Database connection error"
09:04 - Users refresh pages → More failed connections pile up
09:05 - Complete system outage
```

#### Database Connection Math

| Component | Connections per Request | Concurrent Users | Total Connections |
|-----------|------------------------|------------------|-------------------|
| Member API | 1-3 | 2,000 | 2,000-6,000 |
| Coach Dashboard | 5-10 | 100 | 500-1,000 |
| Admin Portal | 3-5 | 20 | 60-100 |
| **Total** | - | 2,120 | **2,560-7,100** |
| **PostgreSQL Limit** | - | - | **100-200** |

---

### 1.2 Coach Dashboard N+1 Query Problem

**Severity:** CRITICAL
**File:** `app/api/coach/dashboard/route.ts`
**Impact:** Dashboard timeouts, database overload

#### Current Implementation

```typescript
// app/api/coach/dashboard/route.ts (lines 123-180)
const membersWithStats: MemberStats[] = await Promise.all(
  members.map(async (member) => {
    // Query 1: This week's logs (per member)
    const thisWeekLogs = await prisma.dailyLog.findMany({
      where: {
        memberId: member.id,
        date: { gte: mondayOfThisWeek },
      },
      select: { date: true, type: true, estimatedCalories: true, estimatedProtein: true },
      orderBy: { date: "desc" },
    });

    // Query 2: Last 30 days logs (per member)
    const last30DaysLogs = await prisma.dailyLog.findMany({
      where: {
        memberId: member.id,
        date: { gte: thirtyDaysAgo },
      },
      select: { date: true, type: true },
    });

    // Query 3: Recent check-ins (per member)
    const recentCheckins = await prisma.weeklyCheckin.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { weight: true, createdAt: true },
    });

    // ... aggregation in JavaScript
  })
);
```

#### Why This Is a Problem

**N+1 Query Pattern:**
- 1 query to fetch all members
- N queries for this week's logs (one per member)
- N queries for last 30 days logs (one per member)
- N queries for check-ins (one per member)
- Total: 1 + 3N queries

**Concrete Example:**

```
Coach has 100 assigned members:
- 1 query: Get all members
- 100 queries: This week's logs
- 100 queries: Last 30 days logs
- 100 queries: Recent check-ins
= 301 database queries for ONE dashboard load

Time per query (average): 20ms
Total time: 301 × 20ms = 6,020ms (6+ seconds)

With database under load: 50ms per query
Total time: 301 × 50ms = 15,050ms (15+ seconds)

Vercel serverless timeout: 60 seconds
Result: Works... barely. But degrades rapidly.
```

**At Scale (10 Gyms, 50 Coaches Total):**

```
50 coaches load dashboard simultaneously:
- 50 × 301 = 15,050 database queries
- Database connection pool: exhausted
- Query queue: backed up
- Response time: 30-60+ seconds
- Many requests: TIMEOUT
```

#### Database Query Log Example

```sql
-- This repeats 100+ times per dashboard load:
SELECT "date", "type", "estimatedCalories", "estimatedProtein"
FROM "daily_logs"
WHERE "memberId" = 'clx1abc...' AND "date" >= '2026-01-01'
ORDER BY "date" DESC;

SELECT "date", "type"
FROM "daily_logs"
WHERE "memberId" = 'clx1abc...' AND "date" >= '2025-12-05';

SELECT "weight", "createdAt"
FROM "weekly_checkins"
WHERE "memberId" = 'clx1abc...'
ORDER BY "createdAt" DESC
LIMIT 4;

-- Repeat for member 2, 3, 4... 100
```

#### Memory Impact

```
Each member's data in memory:
- thisWeekLogs: ~50 log entries × 100 bytes = 5KB
- last30DaysLogs: ~200 log entries × 50 bytes = 10KB
- recentCheckins: 4 entries × 100 bytes = 0.4KB
- Computed stats: ~1KB
= ~16KB per member

100 members = 1.6MB per dashboard load
400 members = 6.4MB per dashboard load

Vercel function memory limit: 1024MB (default)
With 10 concurrent dashboard loads: 64MB (OK)
But queries are the bottleneck, not memory.
```

---

### 1.3 Base64 Images Stored in Database

**Severity:** CRITICAL
**Files:** `prisma/schema.prisma`, multiple API routes
**Impact:** Database bloat, slow queries, high bandwidth costs

#### Current Implementation

```prisma
// prisma/schema.prisma
model Member {
  avatarUrl    String?  @db.Text  // Base64 encoded avatar image (up to 500KB)
}

model DailyLog {
  mealPhotoUrl String?  @db.Text  // Photo from saved meal (base64)
}

model CustomMeal {
  photoUrl     String?  @db.Text  // Base64 image (4:3 landscape, max 1MB)
}

model Gym {
  logo         String?  @db.Text  // Base64 encoded logo image
}
```

```typescript
// app/api/member/avatar/route.ts
const MAX_AVATAR_SIZE = 500 * 1024;  // 500KB limit

// Stores directly in database:
await prisma.member.update({
  where: { id: memberId },
  data: { avatarUrl: base64String },  // Full 500KB stored in PostgreSQL
});
```

#### Why This Is a Problem

**Base64 Encoding Overhead:**
- Binary image: 300KB
- Base64 encoded: 400KB (+33% overhead)
- Stored as TEXT in PostgreSQL: additional indexing overhead

**Database Size Calculation:**

```
Scenario: 10 gyms, 400 members each, 80% have avatars

Avatars:
- 4,000 members × 80% = 3,200 avatars
- Average size: 300KB (after base64: 400KB)
- Total: 3,200 × 400KB = 1.28GB

Meal Photos:
- 4,000 members × 10 saved meals × 50% with photos = 20,000 photos
- Average size: 500KB (after base64: 667KB)
- Total: 20,000 × 667KB = 13.34GB

Gym Logos:
- 10 gyms × 200KB = 2MB

TOTAL DATABASE BLOAT: ~14.6GB just for images
```

**Query Performance Impact:**

```sql
-- Simple member list query:
SELECT id, name, memberId, avatarUrl FROM members WHERE gymId = 'xxx';

-- Without images: Returns in 5ms, transfers 50KB
-- With base64 avatarUrl: Returns in 200ms, transfers 12MB

-- 10 coaches loading member lists:
-- Without images: 500ms total, 500KB bandwidth
-- With images: 2,000ms total, 120MB bandwidth
```

**Concrete Example - Member List Load:**

```
Coach opens member management page:

1. Query: SELECT * FROM members WHERE gymId = 'gym1' (100 members)
2. Each member row: ~400KB (mostly avatarUrl)
3. Total data transfer: 100 × 400KB = 40MB
4. Network time (100Mbps): 3.2 seconds
5. JSON parsing: 500ms
6. React rendering: 1 second

Total load time: 5+ seconds (just for member list)

Expected load time: <500ms
```

**Database Backup Impact:**

```
Daily backup size:
- Application data: ~500MB
- Image blobs: ~14GB
- Total: ~14.5GB

Backup time: 30+ minutes (was 2 minutes without images)
Restore time: 45+ minutes
Storage cost: 3x higher than necessary
```

---

## 2. High Severity Issues

### 2.1 Challenge Points Race Condition

**Severity:** HIGH
**File:** `lib/challenges/points.ts`
**Impact:** Incorrect leaderboards, unfair competition results

#### Current Implementation

```typescript
// lib/challenges/points.ts (lines 80-139)
export async function awardChallengePoints(
  memberId: string,
  visibleGymId: string,
  logType: "meal" | "training" | "water" | "checkin"
): Promise<{ awarded: boolean; points: number; reason?: string }> {
  // Step 1: Find active challenge and participation
  const challenge = await prisma.challenge.findFirst({...});
  const participation = await prisma.challengeParticipant.findFirst({...});

  // Step 2: Calculate streak (reads current data)
  const { newStreak, bonusAwarded } = calculateStreakBonus(
    participation.currentStreak,
    participation.lastActiveDate,
    now
  );

  // Step 3: Update points (NOT ATOMIC with step 1-2)
  await prisma.challengeParticipant.update({
    where: { id: participation.id },
    data: {
      [pointField]: { increment: pointsToAdd },
      totalPoints: { increment: pointsToAdd + streakPointsToAdd },
      streakPoints: { increment: streakPointsToAdd },
      currentStreak: newStreak,
      lastActiveDate: now,
    },
  });
}
```

#### Why This Is a Problem

**Race Condition Timeline:**

```
User rapidly logs 2 meals (double-tap or network retry):

Time 0ms:   Request A reads participation: totalPoints=100, streak=5
Time 5ms:   Request B reads participation: totalPoints=100, streak=5
Time 10ms:  Request A calculates: +5 meal points, streak stays 5
Time 15ms:  Request B calculates: +5 meal points, streak stays 5
Time 20ms:  Request A updates: totalPoints=105, streak=5
Time 25ms:  Request B updates: totalPoints=110, streak=5

Expected: totalPoints=110 (100 + 5 + 5)
Actual: totalPoints=110 (correct by accident)

But streak calculation can diverge badly:
```

**Streak Corruption Example:**

```
User logs at 11:59 PM (end of day):

Time 0ms:   Request A reads: streak=0, lastActiveDate=null
Time 2ms:   Request B reads: streak=0, lastActiveDate=null
Time 5ms:   Request A calculates: newStreak=1, bonus=5 points
Time 7ms:   Request B calculates: newStreak=1, bonus=5 points
Time 10ms:  Request A updates: streak=1, streakPoints+=5
Time 12ms:  Request B updates: streak=1, streakPoints+=5

Result: User got 10 streak bonus points instead of 5
Over a 30-day challenge: Could gain 150 extra points unfairly
```

**Leaderboard Impact:**

```
Challenge with 400 participants, top 3 win prizes:

Position 1: 1,247 points (legitimate)
Position 2: 1,245 points (legitimate)
Position 3: 1,243 points (has 30 extra points from race conditions)
Position 4: 1,242 points (should be position 3)

Prize distribution: INCORRECT
Member at position 4 loses prize they deserved
```

---

### 2.2 AI Rate Limiting Race Condition

**Severity:** HIGH
**File:** `lib/ai/cache.ts`
**Impact:** Budget overruns, unfair usage limits

#### Current Implementation

```typescript
// lib/ai/cache.ts (lines 97-140)
export async function checkRateLimit(memberId: string, subscriptionStatus: string) {
  const limit = subscriptionStatus === "active" ? 20 : 5;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Step 1: READ current count
  const usage = await prisma.aIUsageDaily.upsert({
    where: { memberId_date: { memberId, date: today } },
    create: { memberId, date: today, count: 0 },
    update: {},
  });

  // Step 2: CHECK if allowed (based on stale data)
  return {
    allowed: usage.count < limit,
    remaining: Math.max(0, limit - usage.count),
    limit,
  };
}

// Called SEPARATELY after AI response:
export async function incrementUsage(memberId: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Step 3: INCREMENT (not atomic with check)
  await prisma.aIUsageDaily.upsert({
    where: { memberId_date: { memberId, date: today } },
    create: { memberId, date: today, count: 1 },
    update: { count: { increment: 1 } },
  });
}
```

#### Why This Is a Problem

**TOCTOU (Time Of Check To Time Of Use) Vulnerability:**

```
User has 19/20 messages used (1 remaining):

Time 0ms:   Request A calls checkRateLimit() → count=19, allowed=true
Time 5ms:   Request B calls checkRateLimit() → count=19, allowed=true
Time 10ms:  Request A proceeds to call Claude API ($0.01)
Time 15ms:  Request B proceeds to call Claude API ($0.01)
Time 500ms: Request A calls incrementUsage() → count=20
Time 505ms: Request B calls incrementUsage() → count=21

Result: User made 21 requests on a 20-request limit
```

**At Scale - Budget Impact:**

```
4,000 members, 10% exploit this daily:
- 400 members × 2 extra AI calls = 800 extra calls/day
- Cost per call: ~$0.01
- Daily overrun: $8
- Monthly overrun: $240
- Yearly overrun: $2,880

Plus: Legitimate users see "limit reached" while exploiters continue
```

**Systematic Exploitation:**

```javascript
// Malicious client code (trivial to implement):
async function bypassRateLimit() {
  // Fire 10 requests simultaneously
  const requests = Array(10).fill(null).map(() =>
    fetch('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message: 'Hi' }) })
  );

  // All 10 will pass rate limit check
  await Promise.all(requests);
}

// User with 5/day limit can make 50+ requests
```

---

## 3. Medium Severity Issues

### 3.1 Session Validation Database Overhead

**Severity:** MEDIUM
**File:** `lib/auth/index.ts`
**Impact:** Unnecessary database load, slower API responses

#### Current Implementation

```typescript
// lib/auth/index.ts (lines 133-174)
export async function getMemberFromSession(): Promise<MemberAuthResult | { error: MemberAuthError }> {
  const session = await getSession();  // JWT verification (fast, ~1ms)

  if (session.userType === "staff") {
    // DATABASE QUERY on every staff request!
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { linkedMemberId: true },
    });
    // ...
  }
}
```

#### Impact Analysis

```
Staff API requests per day:
- 100 coaches × 50 requests/day = 5,000 requests
- Each request = 1 DB query for linkedMemberId
- 5,000 extra DB queries/day (just for auth)

At peak load (9 AM):
- 50 coaches active simultaneously
- 10 requests/minute each = 500 requests/minute
- 500 DB queries/minute just for session validation
```

---

### 3.2 Missing Request Body Size Limits

**Severity:** MEDIUM
**Files:** Various API routes
**Impact:** DoS vulnerability, function memory exhaustion

#### Current State

```typescript
// app/api/member/meals/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();  // No size limit!
  const { photoUrl } = body;  // Could be 100MB base64 string
  // ...
}
```

#### Attack Vector

```javascript
// Malicious request:
fetch('/api/member/meals', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Test Meal',
    photoUrl: 'data:image/jpeg;base64,' + 'A'.repeat(100_000_000),  // 100MB
    ingredients: []
  })
});

// Result:
// - Vercel function attempts to parse 100MB JSON
// - Memory limit exceeded (512MB-1024MB)
// - Function crashes
// - Repeated attacks = sustained outage
```

---

### 3.3 Synchronous Cache Cleanup

**Severity:** MEDIUM
**File:** `lib/ai/cache.ts`
**Impact:** Slow AI responses, blocking operations

#### Current Implementation

```typescript
// lib/ai/cache.ts (lines 200-213)
async function cleanupOldCacheEntries() {
  const count = await prisma.aIResponseCache.count();  // Full table scan

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
}

// Called in the request path:
export async function cacheResponse(key: string, response: string) {
  await prisma.aIResponseCache.create({...});
  await cleanupOldCacheEntries();  // BLOCKS user request!
}
```

#### Impact

```
Cache has 10,000 entries, max is 5,000:

1. User asks AI question
2. AI responds in 2 seconds
3. Cache cleanup starts:
   - Count query: 50ms
   - Find 5,000 old entries: 200ms
   - Delete 5,000 entries: 500ms
4. Total cleanup time: 750ms added to response

User sees: 2.75 second response (should be 2 seconds)
```

---

### 3.4 Missing Pagination Defaults

**Severity:** MEDIUM
**File:** `lib/challenges/points.ts` and others
**Impact:** Memory spikes, slow responses for large datasets

#### Current Implementation

```typescript
// lib/challenges/points.ts (lines 202-224)
export async function getChallengeLeaderboard(challengeId: string, limit?: number) {
  return prisma.challengeParticipant.findMany({
    where: { challengeId },
    include: { member: { select: { name: true, avatarUrl: true } } },
    orderBy: [{ totalPoints: "desc" }, { joinedAt: "asc" }],
    take: limit,  // OPTIONAL - defaults to ALL records
  });
}
```

#### Impact

```
Challenge with 400 participants:
- No limit specified → Returns all 400 records
- Each record includes member.avatarUrl (400KB each)
- Total payload: 400 × 400KB = 160MB JSON response

Frontend tries to:
1. Download 160MB
2. Parse 160MB JSON
3. Render 400 leaderboard rows

Result: Browser tab crashes or 30+ second load time
```

---

## 4. Impact Analysis

### Failure Scenarios by User Load

| Users | Connection Pool | Dashboard | Image Load | AI Rate Limit |
|-------|-----------------|-----------|------------|---------------|
| 100 | OK | 3-5s | OK | OK |
| 500 | WARNING | 10-15s | Slow | Minor leaks |
| 1,000 | CRITICAL | Timeouts | Very slow | Noticeable leaks |
| 2,000 | FAILURE | FAILURE | FAILURE | Budget overrun |
| 4,000 | FAILURE | FAILURE | FAILURE | Severe overrun |

### Cost Impact (Monthly)

| Issue | Current (100 users) | At Scale (4,000 users) |
|-------|---------------------|------------------------|
| Database size | 500MB | 15GB+ |
| Bandwidth | 10GB | 500GB+ |
| AI budget overrun | $0 | $200-500 |
| Vercel compute | $20 | $200+ (with failures) |

---

## 5. Recommended Solutions

### Priority 1: Critical (Must Fix)

1. **Database Connection Pooling**
   - Implement Prisma Accelerate or PgBouncer
   - Configure connection limits for serverless

2. **Dashboard Query Optimization**
   - Rewrite with SQL aggregation
   - Add caching layer
   - Implement pagination

3. **Image Storage Migration**
   - Move to Vercel Blob or S3
   - Store only URLs in database
   - Implement image optimization

### Priority 2: High (Should Fix)

4. **Atomic Point Updates**
   - Wrap in database transactions
   - Use optimistic locking

5. **Atomic Rate Limiting**
   - Single transaction for check+increment
   - Consider Redis for distributed rate limiting

### Priority 3: Medium (Nice to Have)

6. **Cache Staff Session Data**
   - Store linkedMemberId in JWT
   - Reduce auth DB queries

7. **Request Size Limits**
   - Add middleware validation
   - Client-side size checks

8. **Background Cache Cleanup**
   - Move to scheduled job
   - Use TTL-based expiration

9. **Pagination Defaults**
   - Set sensible defaults
   - Add cursor-based pagination

---

## Appendix: Testing Checklist

Before going live, verify:

- [ ] Database handles 200+ concurrent connections
- [ ] Dashboard loads in <2s with 100 members
- [ ] Images load from CDN, not database
- [ ] Leaderboard updates are atomic
- [ ] Rate limits cannot be bypassed
- [ ] No request causes >512MB memory usage
- [ ] API responses are <5MB
- [ ] 95th percentile response time <3s

---

*Document maintained by the development team. Last updated: January 2026*
