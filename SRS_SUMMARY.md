# Software Requirements Specification — Summary

**Product:** Classic Method Gym Intelligence System
**Version:** 1.0.0 (committed baseline)
**Status:** Summarized SRS

> This is a **condensed** Software Requirements Specification reflecting the committed
> baseline of the codebase. For the exhaustive, deeply detailed specification see
> [/SRS.md](SRS.md). For technical/user documentation see [/DOCUMENTATION.md](DOCUMENTATION.md),
> the database schema reference in [docs/DATABASE.md](docs/DATABASE.md), and role-specific
> guides under [docs/](docs/README.md).
>
> Scope note: this baseline does **not** include any "stories"/social feed, "crew"
> challenges, per-challenge detail pages, or challenge-type rework — those exist only as
> uncommitted working-tree changes and are out of scope here.

---

## 1. Introduction

### 1.1 Purpose
The Classic Method Gym Intelligence System is a multi-tenant (per-gym) SaaS platform that
helps gyms manage members, coaching, AI-assisted nutrition/training guidance, gamified
challenges, member progress tracking, community fundraising goals, and back-office
inventory/point-of-sale. It targets the Serbian market; the primary UI language is
**Serbian (ekavica)** with English as a secondary locale.

### 1.2 Scope
The system provides three application surfaces backed by a single Next.js/Prisma codebase
and a shared PostgreSQL database:

- **Member PWA** — daily activity logging, personalized nutrition targets, progress and
  metrics, weekly check-ins, AI coaching agents, challenges, and community goal voting.
- **Coach / Staff app** — client dashboards, nudges, per-member AI knowledge, coach-authored
  meals & metrics, assignments, and session scheduling.
- **Gym Portal (admin/owner)** — gym configuration, member & staff lifecycle, subscriptions
  & billing, public marketing pages, challenges/goals administration, and the owner-only
  Magacin (inventory & POS) module.

### 1.3 Definitions & Roles

| Term | Meaning |
| --- | --- |
| **Gym** | Tenant. All data is scoped by `gymId`. |
| **Member** | End user of a gym; authenticates with Member ID + 4-digit PIN. |
| **Staff** | Employee record with `role` = `owner`, `admin`, or `coach`. |
| **Owner** | Cross-gym super-admin (locations + Magacin); shares one staffId/PIN across locations. |
| **Admin** | Full manager of a single gym. |
| **Coach** | Manages only members assigned to them (via `CoachAssignment`). |
| **Difficulty mode** | Per-member training/logging complexity: `simple` / `standard` / `pro` (NOT a billing tier). |
| **Subscription tier** | Per-gym billing plan: `starter` / `pro` / `elite`. |
| **PWA** | Member-facing progressive web app (mobile-first, dark mode default). |

### 1.4 Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16.1.1 (App Router), React 19.2, TypeScript 5 |
| Styling | Tailwind CSS v4 (dark mode default, mobile-first) |
| Database | PostgreSQL via Prisma 6.19 + `@prisma/adapter-neon` 7.2 + `@neondatabase/serverless` (Neon over WebSockets) |
| AI | Anthropic Claude via `@anthropic-ai/sdk` 0.71 — model `claude-3-haiku-20240307` (non-streaming) |
| Auth | Custom JWT (`jose` 6, HS256) + bcryptjs-hashed PINs, HTTP-only `gym-session` cookie (no NextAuth) |
| Payments | Stripe 20 (B2B gym subscriptions; API version `2025-12-15.clover`) |
| Image storage | Vercel Blob 2 (with base64 fallback for small images) |
| Charts / QR | Recharts 3; `qrcode` |
| Testing | Vitest 4 + Testing Library + happy-dom |
| Deployment | Vercel, 3 environments (local / staging-preview / production), each with its own Neon DB chosen at runtime |

---

## 2. System Overview

### 2.1 Application Surfaces
1. **Member PWA** (`app/(member)/*`) — home dashboard, logging, meals/ingredients, metrics,
   progress, history, check-in, challenges, goals, subscription, AI chat agents.
2. **Coach/Staff app** (`app/(staff)/*`) — dashboard, member detail, nudges, knowledge,
   assignment flows, coach-sessions.
3. **Gym Portal** (`app/gym-portal/manage/*`) — dashboard, members, staff, branding/public
   site, check-in config, challenges, goals, locations, Magacin.

### 2.2 Roles & Access
- Two JWT `userType`s exist: `member` and `staff`. The three business roles
  (`owner`/`admin`/`coach`) live only on `Staff.role`.
- Staff may hold a **dual role**: a linked personal `Member` account (`linkedMemberId`) so
  they can use the member app with the same PIN.
- Multi-tenant isolation is enforced by scoping every query by `gymId`, with composite
  uniqueness (`@@unique([memberId, gymId])`, `@@unique([staffId, gymId])`).

### 2.3 High-Level Architecture
- **Middleware** (`middleware.ts`) gates page navigation, enforces role separation between
  member/staff paths, and applies request body-size limits. All `/api/*` routes bypass
  middleware auth and **self-authorize** via `getSession()` / `getMemberFromSession()` plus
  inline role checks (there is intentionally no `getStaffFromSession` helper).
- **Feature gating** by subscription tier via `lib/subscription/guards.ts`, client
  `SubscriptionGuard`, and `TierGate`.
- **Runtime DB selection** (`lib/db/index.ts`) picks local Postgres vs. the Neon serverless
  adapter based on `NODE_ENV` / `VERCEL_ENV`.

---

## 3. Functional Requirements

Each requirement has a stable ID and lists the primary role(s). Requirements are grouped by
module.

### 3.1 Authentication, Roles & Authorization

| ID | Requirement | Roles |
| --- | --- | --- |
| FR-AUTH-01 | Member login with gym + 6-char Member ID (auto-uppercased) + 4-digit PIN; requires member `status = 'active'`. | Member |
| FR-AUTH-02 | Staff/Admin/Owner login with gym + Staff ID (`S-XXXX`) + PIN; routes by role (owner→locations, admin→manage, coach→dashboard). | Coach/Admin/Owner |
| FR-AUTH-03 | Gym owner self-registration creates a Gym (`pending`) + first owner Staff, returning generated Staff ID + plaintext PIN once. | Owner |
| FR-AUTH-04 | Logout clears the `gym-session` cookie for members and staff. | All |
| FR-AUTH-05 | Stateless HS256 JWT session (`userId`, `userType`, `gymId`, optional `linkedMemberId`), 30-day lifetime, HTTP-only cookie. | All |
| FR-AUTH-06 | `getMemberFromSession()` resolves member context for member APIs, transparently mapping a staff user to their linked member; typed errors (`NO_SESSION`, `STAFF_NO_LINKED_MEMBER`, `INVALID_USER_TYPE`). | Member/Coach |
| FR-AUTH-07 | Middleware route protection: public paths, redirect unauthenticated users to `/login` or `/staff-login`, clear invalid sessions, enforce member/staff path separation. | All |
| FR-AUTH-08 | Manage-portal authorization: requires admin/owner; owners confined to `/locations`. | Admin/Owner |
| FR-AUTH-09 | Staff management (admin-scoped): list staff and create coach/admin accounts; credentials shown once. | Admin |
| FR-AUTH-10 | Owner cross-location staff management for gyms sharing the owner's `ownerEmail`. | Owner |
| FR-AUTH-11 | Staff dual-role account: create a new linked member (same PIN, free active sub) or link/unlink an existing member (PIN-verified). | Coach/Admin |
| FR-AUTH-12 | Subscription access guard: redirect expired members to `/subscription-expired` and members of expired gyms to `/unavailable`; fails open on API error. | Member |
| FR-AUTH-13 | Tier-based feature gating (challenges/sessionScheduling/coachFeatures require Pro+, customBranding requires Elite). | All |
| FR-AUTH-14 | Request body-size enforcement: 5MB default, 2MB for image-upload paths; over-limit → HTTP 413. | All |

### 3.2 Daily Logging, Home Dashboard & Difficulty Modes

| ID | Requirement | Roles |
| --- | --- | --- |
| FR-LOG-01 | Log a meal (Standard): pick size (small/medium/large auto-estimated by goal), pick a saved/coach meal, or enter custom calories; optional meal name. | Member |
| FR-LOG-02 | Photo meal logging with optional Claude Vision AI estimation (calories/macros + confidence); size-based fallback; ≤1MB image. | Member |
| FR-LOG-03 | One-tap training log (no extra data). | Member |
| FR-LOG-04 | One-tap water log (1 glass per tap; 8 = aspirational target, ≥4 = consistent day). | Member |
| FR-LOG-05 | Simple-mode quick meal log (`Jeo/la sam`): records a medium `Obrok` with no macros/calories tracked. | Member |
| FR-LOG-06 | Pro / exact-macro logging: require selecting a coach/saved meal or entering exact P/C/F grams; calories auto-derived `P*4 + C*4 + F*9`. | Member |
| FR-LOG-07 | Personalized daily target calculation via priority chain: coach targets > member custom targets > auto from weight & goal. | Member/Coach |
| FR-LOG-08 | Daily status & progress dashboard: calorie ring, toggleable macro ring, consumed vs. target, on_track/needs_attention/off_track badge. | Member |
| FR-LOG-09 | Today's activity summary (trained ✓/—, water x/8, meals count); Simple mode shows a 3-tile activity card. | Member |
| FR-LOG-10 | Contextual advice & recovery nudges (low water, low protein, no-training, calorie-surplus) linking to AI chat; hidden in Simple mode. | Member |
| FR-LOG-11 | Meal history viewer (bottom-sheet: today's meals with macros, photo, daily total). | Member |
| FR-LOG-12 | Difficulty mode selection (Simple/Standard/Pro) in Profile; not tier-gated; identical challenge points across modes. | Member |
| FR-LOG-13 | Weekly reset: stamp `weekResetAt = now` so consistency scoring restarts from that date. | Member |
| FR-LOG-14 | Consistency & streak scoring utilities (0–100 weekly score; logging streaks). | Member/Coach |
| FR-LOG-15 | Onboarding gate: members with `hasSeenOnboarding = false` are redirected to the "Zašto ovo funkcioniše" explainer. | Member |
| FR-LOG-16 | Staff dual-role home with "Trenerski režim" toggle back to the coach dashboard. | Coach |

### 3.3 Meals, Ingredients & Nutrition

| ID | Requirement | Roles |
| --- | --- | --- |
| FR-MEAL-01 | Create a custom meal from ≥1 ingredient (name, portion, calories; P/C/F optional). | Member |
| FR-MEAL-02 | Auto-summed totals unless `Ručno podesi` (manual override). | Member |
| FR-MEAL-03 | Edit/delete own meals; coach-created meals are non-editable but member-deletable; others' shared meals are read-only. | Member |
| FR-MEAL-04 | Personal saved-ingredients library (create/edit/delete). | Member |
| FR-MEAL-05 | Ingredient search over own + gym-shared (server requires ≥2 chars; 300ms debounce). | Member |
| FR-MEAL-06 | Share a meal gym-wide (requires a photo) → pending admin approval before others see it. | Member/Admin |
| FR-MEAL-07 | Share a saved ingredient (no approval required). | Member |
| FR-MEAL-08 | Copy an approved gym-shared meal (authored by another) into own private meals. | Member |
| FR-MEAL-09 | Built-in static ingredient DB (~90 items, per-100g/ml, diacritic-insensitive, fuzzy) for free macro estimates. | Member |
| FR-MEAL-10 | AI ingredient macro deduction (`AI popuni`): static DB first, Claude Haiku fallback (rate-limited for members). | Member |
| FR-MEAL-11 | Photo-based meal logging (AI Vision) returning Serbian description/items/macros + confidence; 3/day for active members. | Member |
| FR-MEAL-12 | Log a saved meal (own/coach/shared) via `/log?mealId=…`. | Member |
| FR-MEAL-13 | Coach-authored meals for an assigned member (`createdByCoachId` set; "Od trenera" tab, read-only). | Coach/Member |
| FR-MEAL-14 | Admin approval queue for pending shared meals (approve / reject). | Admin |

### 3.4 Custom Metrics, Progress, History & Weekly Check-in

| ID | Requirement | Roles |
| --- | --- | --- |
| FR-MET-01 | Create custom metric (name, unit, optional target, `higherIsBetter`). | Member |
| FR-MET-02 | Coach creates a metric for an assigned member (`createdByCoachId`; member cannot edit/delete). | Coach |
| FR-MET-03 | Edit/delete own metric (cascade deletes entries); coach-created → 403 for member. | Member |
| FR-MET-04 | Coach edits/deletes only metrics they created for an assigned member. | Coach |
| FR-MET-05 | Log/upsert a metric entry (one per metric per day) with optional note. | Member |
| FR-MET-06 | Delete a specific metric entry. | Member |
| FR-MET-07 | Semaphore status per entry vs. target (on_track/needs_attention/off_track/neutral). | Member/Coach |
| FR-MET-08 | Change-from-reference calc (% or absolute p.p. for `%`-unit metrics). | Member/Coach |
| FR-MET-09 | Table + Recharts graph views with 7/30/90/365-day range filter and swipeable carousel. | Member |
| FR-MET-10 | Coach reads assigned member's metrics/entries (read-only; no add-entry endpoint). | Coach |
| FR-MET-11 | Weekly check-in: weight (30–300 kg) + feeling (1–4); Sunday-only, once/ISO week, ≥7-day spacing; updates member weight. | Member |
| FR-MET-12 | Check-in eligibility/accountability (reason, days-until-next, missed weeks). | Member |
| FR-MET-13 | Weekly check-in awards points to active `points`-type challenges (non-blocking). | Member |
| FR-MET-14 | New metric entry updates matching `pr_duel` challenges by metric name (non-blocking). | Member |
| FR-MET-15 | Progress dashboard (weight trend, totals, avg feeling, consistency score + breakdown, SVG chart, motivational message). | Member |
| FR-MET-16 | Weekly consistency score (0–100) with a Simple-mode variant that drops calories/protein and re-weights. | Member |
| FR-MET-17 | 30-day History activity calendar colored by daily activity level with per-day detail. | Member |

> Note: `WeeklyCheckin.photoUrl` exists in the schema but **progress-photo capture is not
> implemented** in this baseline. `lib/checkin.ts` is a separate gym-attendance daily-code
> feature (see §3.10), not the weekly check-in.

### 3.5 Personal Goals, Goal Voting & Fundraising

| ID | Requirement | Roles |
| --- | --- | --- |
| FR-GOAL-01 | Personal fitness goal selection (`fat_loss` / `recomposition` / `muscle_gain`) driving calorie/macro targets; history preserved on change. | Member |
| FR-GOAL-02 | Coach goal override via `CoachAssignment.customGoal` (+ custom targets); member cannot self-edit targets while assigned. | Coach |
| FR-GOAL-03 | Admin creates a community `Goal` with 1+ voteable options (name, description/image, euro target). | Admin |
| FR-GOAL-04 | Publish goal: single-option → fundraising (winner pre-set); multi-option → voting (requires future `votingEndsAt`). | Admin |
| FR-GOAL-05 | Member voting: one vote per goal, changeable until deadline; live counts/percentages. | Member |
| FR-GOAL-06 | Close voting automatically (lazy on API access) or manually; highest votes win (ties → lower `displayOrder`) → fundraising. | Admin/Member |
| FR-GOAL-07 | Fundraising progress tracking toward winning option target; auto-complete when current ≥ target. | Member/Admin |
| FR-GOAL-08 | Automatic `subscription` contributions to every fundraising goal when a membership is extended/activated. | Admin |
| FR-GOAL-09 | Manual admin contribution (euros + optional note) while fundraising. | Admin |
| FR-GOAL-10 | Cancel any non-completed goal, or delete a draft with zero votes/contributions. | Admin |
| FR-GOAL-11 | Admin goal dashboard with status tabs, vote totals, contribution counts, progress, and 50 most-recent contributions. | Admin |
| FR-GOAL-12 | Member goals feed (active voting, active fundraising, recently completed ≤30 days). | Member |
| FR-GOAL-13 | Legacy `FundraisingGoal` campaigns are read-only-displayed on the member home (≤3), explicitly being replaced by the unified Goal system. | Member |

### 3.6 AI Agents, Photo Analysis & Ingredient Deduction

| ID | Requirement | Roles |
| --- | --- | --- |
| FR-AI-01 | General AI gym-coach chat that explains the member's own data and gives one focused suggestion (≤2–3 sentences, no medical advice). | Member |
| FR-AI-02 | Specialized nutrition agent (`Ishrana` / Nutricionista) scoped to calories/macros/timing/hydration. | Member |
| FR-AI-03 | Specialized supplements agent (`Suplementi`) — no brands, always advises consulting a doctor. | Member |
| FR-AI-04 | Specialized training agent (`Trening` / Trener) — refers injuries to a professional. | Member |
| FR-AI-05 | Coach knowledge injection: per-member per-agent `CoachKnowledge` appended to the agent system prompt. | Coach/Member |
| FR-AI-06 | Live member-data context injection (goal, weight, today's macros vs targets, weekly sessions, water, consistency, streak). | Member |
| FR-AI-07 | Meal photo nutrition analysis (Vision), strict JSON, goal-adjusted, confidence level. | Member |
| FR-AI-08 | Ingredient nutrition deduction (static DB → `database/high`, else Claude → `ai/medium`). | Member/Coach |
| FR-AI-09 | Ingredient search/suggestions from the static DB (min 2 chars). | Member/Coach |
| FR-AI-10 | Response caching for common questions (general chat only) via `AIResponseCache` (7-day TTL, 500-entry LRU). | Member |
| FR-AI-11 | Per-member daily usage limits (text count + photo analyses) tracked in `AIUsageDaily`. | Member |
| FR-AI-12 | Per-gym monthly AI budget cap (`AIUsageMonthly.estimatedCostUsd` vs `Gym.aiMonthlyBudget`); over budget → HTTP 503. | Admin/Member |
| FR-AI-13 | Tier-gated daily message allowance (starter 10 / pro 25 / elite 50; trial = min(5, limit); expired/cancelled = 0). | Admin/Member |
| FR-AI-14 | Photo-analysis usage lookup (used/remaining/limit/available) without consuming quota. | Member |

### 3.7 Coaching / Staff Tools

| ID | Requirement | Roles |
| --- | --- | --- |
| FR-COACH-01 | Coach dashboard of assigned clients with computed activity status, consistency %, streak, alerts, and aggregate stats. | Coach |
| FR-COACH-02 | Per-member computed activity status & text alerts from daily logs and check-ins. | Coach |
| FR-COACH-03 | Member detail / client profile (snapshot vs targets, check-ins, nudges, notes, rule-based behavior summary). | Coach/Admin |
| FR-COACH-04 | Send one-way nudges (`CoachNudge`), free-text or from 5 templates. | Coach |
| FR-COACH-05 | Per-member AI coaching knowledge (max 2000 chars per agent type; blank content deletes). | Coach |
| FR-COACH-06 | Create/edit/delete meals on behalf of an assigned member. | Coach |
| FR-COACH-07 | Create/edit/delete custom metrics for a member; view entry history & charts. | Coach |
| FR-COACH-08 | Assign a member via request (plan: goal, macros, notes, `requireExactMacros`); member must accept (destructive log reset). | Coach/Member |
| FR-COACH-09 | Direct assignment (bypasses request/accept; deletes pending requests). | Coach |
| FR-COACH-10 | Review member-initiated coach requests (accept = arrange meeting, returns phone / decline). | Coach |
| FR-COACH-11 | `requireExactMacros` enforcement surfaced to the member's logging UI. | Coach/Member |
| FR-COACH-12 | List unassigned gym members (active, no coach, no staff-linked account). | Coach/Admin |
| FR-COACH-13 | Dual-role personal member account toggle ("Moj nalog"). | Coach/Admin |
| FR-COACH-14 | Staff management: admins create coaches/admins with one-time credentials; view coach performance analytics. | Admin |

### 3.8 Session Scheduling (Member ↔ Coach)

| ID | Requirement | Roles |
| --- | --- | --- |
| FR-SESS-01 | Create a `SessionRequest` (type, proposed time, duration, location, note); records initial `SessionProposal`. | Member/Coach |
| FR-SESS-02 | Turn-based accept / decline / counter (counters flip whose turn it is and are audited). | Member/Coach |
| FR-SESS-03 | Accepting creates a confirmed `ScheduledSession` (linked via `originalRequestId`). | Member/Coach |
| FR-SESS-04 | Cancel a confirmed session with a mandatory reason (≥10 chars). | Member/Coach |
| FR-SESS-05 | Mark a confirmed session completed (coach only). | Coach |
| FR-SESS-06 | Sessions dashboard: active requests, upcoming confirmed, recent past (30 days), plus counterpart list. | Member/Coach |
| FR-SESS-07 | At most one active (pending/countered) request per coach–member pair. | Member/Coach |
| FR-SESS-08 | Entire feature gated behind `sessionScheduling` (Pro/Elite); durations 30/45/60/90 min; proposals ≥24h out. | All |

### 3.9 Challenges / Gamification & Gym QR Check-in

| ID | Requirement | Roles |
| --- | --- | --- |
| FR-CHAL-01 | Create a challenge with configurable points (meal/training/water/checkin + streak bonus), winner count, and exclusion settings; one non-ended challenge per gym. | Admin |
| FR-CHAL-02 | Lifecycle: publish (draft→registration) and end (snapshot top-N winners atomically). | Admin |
| FR-CHAL-03 | Edit only while draft/registration; delete only a draft with zero participants. | Admin |
| FR-CHAL-04 | Per-challenge scoring config (defaults: meal 5, training 15, water 1, checkin 25, streakBonus 5, excludeTopN 3, cooldown 3mo). | Admin |
| FR-CHAL-05 | Members join during the registration window; coaches (dual-role) are forbidden from joining. | Member |
| FR-CHAL-06 | Earn points from meal/water/training logs (fire-and-forget), with once-per-day streak bonus. | Member |
| FR-CHAL-07 | Anti-cheat: training points require a same-day gym QR check-in when the gym has check-in enabled. | Member |
| FR-CHAL-08 | Weekly progress check-in grants `pointsPerCheckin`. | Member |
| FR-CHAL-09 | Streak bonus logic (consecutive qualifying days; same-day repeat no bonus; missed day resets to 1). | Member |
| FR-CHAL-10 | Leaderboard & personal rank, per-category breakdown, current streak, days remaining. | Member/Admin |
| FR-CHAL-11 | Winner recording + post-win cooldown (rank ≤ excludeTopN within cooldown window blocks new joins). | Member/Admin |
| FR-CHAL-12 | Gym QR check-in administration: enable/regenerate/disable secret; display daily code + stats. | Admin |
| FR-CHAL-13 | Member gym check-in via daily code (one `GymCheckin` per day; repeat is idempotent). | Member |
| FR-CHAL-14 | Entire feature tier-gated (Pro/Elite). | All |

### 3.10 Subscriptions, Tiers, Trials & Stripe Payments

| ID | Requirement | Roles |
| --- | --- | --- |
| FR-SUB-01 | Three-tier gym catalog: starter €99 / pro €199 / elite €299 (cents), each with member cap, AI limits, budget, and feature flags. | Admin |
| FR-SUB-02 | Per-tier feature gating (active/grace status required). | All |
| FR-SUB-03 | Member capacity enforcement (50 / 150 / unlimited) on member creation. | Admin/Coach |
| FR-SUB-04 | Tier-aware AI usage limits enforced atomically per day. | Member |
| FR-SUB-05 | Gym AI monthly budget cap (USD) → HTTP 503 when exceeded. | Admin/Member |
| FR-SUB-06 | Gym self-service registration (status `pending`, one-time owner credentials). | Admin |
| FR-SUB-07 | Stripe Checkout subscription session for a chosen tier; rejects already-active gyms. | Admin |
| FR-SUB-08 | Change tier (upgrade/downgrade) with immediate Stripe proration + `SubscriptionLog`. | Admin |
| FR-SUB-09 | Stripe webhook syncs status/dates/tier (`checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`→grace, `subscription.deleted`→expired, `subscription.updated`). | System |
| FR-SUB-10 | Member subscription status view; lazily flips active→expired past `subscribedUntil`; blocks on gym expiry. | Member |
| FR-SUB-11 | Member lockout via `SubscriptionGuard` (fails open on API error). | Member |
| FR-SUB-12 | Gym tier-info dashboard data (tier, limits, features, member count, capacity %). | Admin/Member |

> The **member membership (€5/month)** is a separate B2C concept renewed **manually at the
> gym counter** with no Stripe integration — only status/date fields are tracked.

### 3.11 Gym Portal / Admin (Owner) Management

| ID | Requirement | Roles |
| --- | --- | --- |
| FR-ADMIN-01 | Owner/Admin dashboard (subscription status/days, member/staff counts, quick actions, public-site preview). | Admin/Owner |
| FR-ADMIN-02 | Create member with generated Member ID + PIN + login QR; auto-assign to coach if creator is a coach. | Admin/Coach |
| FR-ADMIN-03 | Member capacity gating by tier (403 `MEMBER_LIMIT_REACHED`). | Admin |
| FR-ADMIN-04 | Member list with computed activity status, filters, search, sorting, pagination. | Admin |
| FR-ADMIN-05 | Member detail (targets, streak, 30-day activity, check-ins, AI summaries, notes). | Admin |
| FR-ADMIN-06 | Add staff note to a member. | Admin/Coach |
| FR-ADMIN-07 | Update member fields (subscription status/date, goal, weight, height, status). | Admin |
| FR-ADMIN-08 | Extend/activate membership (server price table 1=5€/3=15€/6=30€/12=60€ or custom date); logs + contributes to fundraising goals. | Admin |
| FR-ADMIN-09 | View member subscription history (last 20 log entries). | Admin |
| FR-ADMIN-10 | Client-side CSV export of members (UTF-8 BOM). | Admin |
| FR-ADMIN-11 | Staff management (create/list with counts). | Admin |
| FR-ADMIN-12 | Coach performance analytics (assignments, nudge view-rates, member outcomes, gym summary). | Admin |
| FR-ADMIN-13 | Public site settings (name, about, contact, opening hours, colors). | Admin |
| FR-ADMIN-14 | Branding (logo → blob, hex colors, unique URL slug with reserved-word/uniqueness checks). | Admin/Owner |
| FR-ADMIN-15 | Gallery management (≤6 images in `galleryImages` JSON). | Admin |
| FR-ADMIN-16 | Gym QR check-in configuration (SHA-256 daily code). | Admin |
| FR-ADMIN-17 | Pending shared-meal approval queue. | Admin |
| FR-ADMIN-18 | Multi-location management (list/create/edit locations by shared `ownerEmail`; per-location staff). | Owner |
| FR-ADMIN-19 | Public marketing pages (unauthenticated by slug: about, hours, gallery, website-visible trainers, sibling locations). | Public |
| FR-ADMIN-20 | Tier info + gym directory (`/api/gyms`) for the login picker. | All |
| FR-ADMIN-21 | Challenge management (Pro+): create/edit/publish/end/delete. | Admin |
| FR-ADMIN-22 | Goal voting/fundraising management (Pro+). | Admin |

### 3.12 Magacin (Warehouse / Inventory) & Point of Sale

| ID | Requirement | Roles |
| --- | --- | --- |
| FR-MAG-01 | Product category management (unique per gym; cannot delete a category with products). | Owner |
| FR-MAG-02 | Product catalog CRUD (name, SKU, image, category, RSD price, cost, stock, low-stock alert, active); soft-delete when sales exist. | Owner |
| FR-MAG-03 | Stock tracking with immutable `StockLog` audit (purchase/return/adjustment; never negative). | Owner |
| FR-MAG-04 | Point of sale: record a sale (active in-stock product, quantity, optional member, payment method); atomic stock decrement + `sale` log. | Owner |
| FR-MAG-05 | Sales history + summary (total sales, revenue, units), filterable by date/product. | Owner |
| FR-MAG-06 | Low/out-of-stock badges, filters, and total inventory value. | Owner |
| FR-MAG-07 | Product image upload (client-validated image/* < 1MB, stored as base64 data URL). | Owner |
| FR-MAG-08 | Static member supplement guide keyed to training goal (educational; NOT connected to owner inventory). | Member |

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **NFR-PERF-01** — Page load target < 2s; API response target < 500ms; AI response target < 5s.
- **NFR-PERF-02** — Coach dashboard batches data into 3 queries (not 3N); assign/register member picker caps rendered results at 20.
- **NFR-PERF-03** — Denormalized cached counters (`GoalOption.voteCount`, `ChallengeParticipant` point totals) avoid per-request aggregation.
- **NFR-PERF-04** — Non-blocking side effects (point awarding, PR-duel updates, contributions) run fire-and-forget with `.catch(console.error)`.

### 4.2 Security
- **NFR-SEC-01** — PINs hashed with bcrypt (cost 10, `bcryptjs`); credentials returned in plaintext only once at creation.
- **NFR-SEC-02** — Stateless JWT (`jose`, HS256) in an HTTP-only `gym-session` cookie; `secure` in production, `sameSite=lax`, 30-day lifetime.
- **NFR-SEC-03** — `JWT_SECRET` must be ≥32 chars and differ per environment; an insecure hardcoded fallback exists if unset (non-prod risk to remove).
- **NFR-SEC-04** — Multi-tenant isolation: every query scoped by `gymId`; composite uniqueness per gym; cross-gym owner access requires matching `ownerEmail`.
- **NFR-SEC-05** — All `/api/*` routes self-authorize (`getSession`/`getMemberFromSession` + inline role checks); middleware also enforces body-size limits (413).
- **NFR-SEC-06** — Concurrency-safe atomic operations: rate-limit increments, `castVote`, `selectWinner`, and point awarding use Prisma **Serializable** transactions (5s timeout).
- **NFR-SEC-07** — Stripe webhook signature verified with `STRIPE_WEBHOOK_SECRET`; raw body read (dynamic force-dynamic).
- **NFR-SEC-08** — Daily gym check-in code = first 8 uppercase hex chars of `SHA-256(masterSecret + UTC date)`, rotating at midnight UTC with a 1-hour grace for yesterday's code.
- **NFR-SEC-09** — Open-redirect protection on staff-login (`?redirect` honored only if it starts with `/`); generic credential error messages.

> Known role-casing inconsistencies exist across a few admin routes (e.g. strict `'ADMIN'`
> vs `role.toLowerCase()`), and `/api/gym/branding` does not enforce the Elite-only
> `customBranding` flag — documented as caveats, not intended behavior.

### 4.3 Usability
- **NFR-USE-01** — Mobile-first, dark mode default, min 44px touch targets; `GlassCard` frosted-glass UI.
- **NFR-USE-02** — WCAG 2.1 AA target.
- **NFR-USE-03** — Destructive actions (coach-request acceptance, week reset) require explicit confirmation.

### 4.4 Reliability / Availability
- **NFR-REL-01** — 99.9% uptime target with graceful degradation when AI is unavailable.
- **NFR-REL-02** — `SubscriptionGuard` fails **open** on API errors (availability over strict enforcement).
- **NFR-REL-03** — Neon provides point-in-time recovery / branch-based backups; production migrations apply via `prisma migrate deploy`.
- **NFR-REL-04** — PWA/offline is aspirational only (no service worker in `next.config.ts` in this baseline).

### 4.5 Scalability
- **NFR-SCALE-01** — Current capacity ~100–200 concurrent vs. a 3,000–4,000 target; see [SCALABILITY_ISSUES.md](SCALABILITY_ISSUES.md).
- **NFR-SCALE-02** — Known blockers: serverless DB connection pooling, coach-dashboard N+1, base64 images bloating Postgres, challenge-points race condition, and AI rate-limit TOCTOU race.
- **NFR-SCALE-03** — Neon pool (cloud): max 10 connections, idle 30s, connect timeout 10s.
- **NFR-SCALE-04** — Leaderboard queries default to 50, hard-capped at 200.

### 4.6 Maintainability
- **NFR-MAINT-01** — Vitest suite (17 API/lib test files) with fully mocked Prisma/auth/AI/Blob/QRCode; v8 coverage over `app/api/**` and `lib/**`.
- **NFR-MAINT-02** — Prisma schema with `@@map()` snake_case tables; migrations committed to git.
- **NFR-MAINT-03** — Environment-aware DB client selection; three deployment environments.

### 4.7 Localization
- **NFR-L10N-01** — Serbian ekavica default (`sr`), English secondary (`en`); static typed dictionary + `LocaleProvider`; per-user `locale`.
- **NFR-L10N-02** — Dates formatted with `sr-RS` / `sr-Latn-RS`; Serbian portion units (`g/kg/ml/L/kom/parče/kašika/kašičica/šolja`); diacritic-insensitive matching.
- **NFR-L10N-03** — AI agents reply in Serbian (Latin script unless the user writes Cyrillic); the general assistant prompt is English.

### 4.8 Compatibility
- **NFR-COMPAT-01** — Modern evergreen browsers; mobile-first responsive layout.
- **NFR-COMPAT-02** — Accepted image types JPEG/PNG/WebP; size caps (avatar 500KB, meal 1MB, branding/logo 1MB).
- **NFR-COMPAT-03** — Currencies: gym tiers in EUR (cents), member membership €5/mo, goal/contribution amounts in cents, Magacin prices in whole RSD.

---

## 5. Data Model (39 Prisma entities)

Full field-level detail is in [docs/DATABASE.md](docs/DATABASE.md). Entities grouped by domain:

| Group | Entities |
| --- | --- |
| Identity / Gym | `Gym`, `Member`, `Staff`, `Session` |
| Member activity | `DailyLog`, `WeeklyCheckin`, `AISummary`, `StaffNote`, `ChatMessage` |
| AI usage / caching | `AIResponseCache`, `AIUsageDaily`, `AIUsageMonthly` |
| Coaching | `CoachAssignment`, `CoachRequest`, `CoachNudge`, `CoachKnowledge` |
| Nutrition | `CustomMeal`, `MealIngredient`, `SavedIngredient` |
| Session scheduling | `SessionRequest`, `SessionProposal`, `ScheduledSession` |
| Challenges / check-in | `Challenge`, `ChallengeParticipant`, `ChallengeWinner`, `GymCheckin` |
| Goals / fundraising | `Goal`, `GoalOption`, `GoalVote`, `GoalContribution`, plus legacy `FundraisingGoal`, `FundraisingContribution` |
| Custom metrics | `CustomMetric`, `MetricEntry` |
| Subscriptions | `SubscriptionLog` |
| Commerce / Magacin | `ProductCategory`, `Product`, `StockLog`, `Sale` |

Conventions: all tenant data carries `gymId` with `onDelete: Cascade`; uniqueness is scoped
per gym; monetary amounts are stored as integer cents (EUR domains) or whole RSD (Magacin).

---

## 6. Key Business Rules

- **Daily target calc** — `calories = round(weightKg * 2.205 * avgMultiplier)` where the goal
  band multiplier averages: fat_loss 10–12, recomposition 13–15, muscle_gain 16–18 (kcal/lb);
  default weight 70kg. Macro splits by goal — fat_loss 40/30/30, recomposition 35/40/25,
  muscle_gain 30/45/25 (protein/carbs @4, fats @9 kcal/g).
- **Target priority chain** — coach targets > member custom targets > auto-calculated.
- **Daily status** — `expectedProgress = min(1, currentHour/20)`; on_track requires calorie
  progress within `[0.8*expected, 1.1]`, protein ≥ `0.7*expected`, and trained-or-water≥4.
- **Consistency score (0–100)** — training 30 / logging 20 / calorie adherence 25 / protein 15
  / water 10 (Standard/Pro), normalized by available days since `weekResetAt`/signup; Simple
  mode drops calories/protein and re-weights (training 50 / logging 33 / water 17). Levels:
  ≥70 on_track, ≥40 needs_attention, else off_track.
- **Weekly check-in gating** — Sunday only, once per ISO week, ≥7 days since last check-in.
- **Tier gating** — challenges/sessionScheduling/coachFeatures require Pro+; customBranding
  requires Elite; feature access also requires subscription status `active` or `grace`.
- **AI usage limits** — legacy per-member/day (trial 5 / active 20) for general chat & member
  ingredient deduction; tier-aware (starter 10 / pro 25 / elite 50, trial min(5, limit),
  expired/cancelled 0) for agent chat; photo Vision 3/day (active only); staff bypass rate
  limits for ingredient deduction. Gym monthly USD budget caps total AI cost (503 on exceed).
- **Challenge status** — computed from dates + stored status; join only during `registration`
  (window = `startDate + joinDeadlineDays`); training points require same-day `GymCheckin`
  only when the gym has a `checkinSecret`.
- **Winner cooldown** — a member with a `ChallengeWinner` at this gym where `rank ≤ excludeTopN`
  and `wonAt` within `winnerCooldownMonths` is blocked from joining (`WINNER_COOLDOWN`, 403).
- **Trial / expiry** — no fixed trial-days constant; seed sets trial `subscribedUntil` = +7d.
  `member/subscription` lazily flips active→expired past `subscribedUntil`; gym expiry blocks
  all members (`gym_expired` → `/unavailable`).
- **Voting** — one vote per member per goal (changeable until deadline); winner = max votes,
  tie-break lower `displayOrder`; fundraising auto-completes when `currentAmount ≥ target`.
- **Subscription contributions** — extending/activating a membership adds the paid amount
  (euros×100 cents) to **every** fundraising-status goal in the gym.
- **Magacin invariants** — stock never negative; sale rejected if product inactive or
  `currentStock < quantity`; every stock movement writes a `StockLog`; category deletion
  blocked while products reference it; products with sales are soft-deleted.

---

## 7. Assumptions & Constraints

- **Committed baseline only** — no stories/social feed, crew challenges, per-challenge detail
  pages, or challenge-type rework (uncommitted WIP excluded).
- **Two subscription systems coexist** — B2B gym billing via Stripe (starter/pro/elite) and
  B2C member membership (€5/mo, manual counter renewal, no payment integration).
- **`difficultyMode` ≠ subscription tier** — Simple/Standard/Pro is a per-member training
  setting, unrelated to gym billing tiers.
- **Single AI model** — every AI call site uses `claude-3-haiku-20240307`, non-streaming; the
  "typing" effect is purely client-side.
- **Legacy models remain** — `FundraisingGoal`/`FundraisingContribution` are read-only-displayed
  and explicitly being replaced by the unified `Goal` system.
- **Serbian-first** — all member/admin-facing UI and error strings are Serbian ekavica.
- **Documented discrepancies** — subscription price display vs. server table (client shows
  discounted 5/12/24/48€ but server records 5/15/30/60€), role-casing inconsistencies on a few
  admin routes, and `customBranding` not enforced on branding — see [/SRS.md](SRS.md) for full detail.
- **Deployment** — Vercel with three environments (local / staging-preview / production), each
  bound to its own Neon database selected automatically at runtime; migrations must be committed.

---

*See [/SRS.md](SRS.md) for the exhaustive specification, [/DOCUMENTATION.md](DOCUMENTATION.md)
for technical/user docs, and [docs/README.md](docs/README.md) for the user-guide index.*
