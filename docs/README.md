# User Guide

Welcome to the user guide for the **Classic Method Gym Intelligence System** — a multi-tenant SaaS platform that helps gyms run member management, AI-powered coaching, daily tracking, challenges, goals, and inventory from a single connected system.

This index explains how the product works, who uses it, and where to go next.

> **Language note:** The application UI is in **Serbian (ekavica dialect)** by default, with English as a secondary locale. Throughout these guides, Serbian button and screen labels are shown in quotes (e.g. "Unesi podatke") next to their English meaning so you can match the docs to what you see on screen.

---

## 1. How the App Works

The platform is sold **business-to-business (B2B)**: the **gym is the paying customer**. A gym subscribes to one of three tiers (Starter €99 / Pro €199 / Elite €299 per month, billed through Stripe), and that subscription unlocks the platform for the gym's staff and members. Members themselves do not pay the platform — their own gym membership (5€/month) is handled manually "at the gym counter" and is only tracked as a status, not billed online.

Once a gym is active, the product runs as **three connected surfaces**, all served from the same codebase and the same data:

| Surface | Who uses it | What it is |
|---------|-------------|------------|
| **Member app** | Gym members | The mobile-first daily-use app: log meals/training/water, view a personalized dashboard, chat with AI agents, track metrics, join challenges, vote on goals, and check in. |
| **Coach / Staff app** | Coaches (and admins/owners) | The staff-facing tools: a dashboard of assigned clients, nudges, per-client AI guidance, coach-created meals and metrics, session scheduling, and client assignment. |
| **Gym Portal (admin)** | Gym owners & admins | The back office: member and staff management, subscriptions, branding, public marketing page, challenges, goals, QR check-in, and the owner-only Magacin (inventory / point-of-sale) module. |

Everything is **multi-tenant**: every record is scoped to a single gym (`gymId`), and one gym can never see another gym's data. Members and staff log in by first selecting their gym, then entering an ID and a 4-digit PIN.

### The intelligence layer

What ties the surfaces together is **shared data and AI**:

- A member's daily logs feed their **Home dashboard** (calorie/macro rings, status badges, streaks) and their **consistency score**.
- The **same logs become visible to their coach**, who sees a computed activity status and can respond with nudges, custom meals, custom metrics, and AI "knowledge" that shapes the member's AI-agent replies.
- Activity also drives **gamification**: logging meals, water, training, and weekly check-ins earns points toward gym challenges and leaderboards.
- AI is powered by **Anthropic Claude** (three Serbian-language agents — Ishrana/nutrition, Suplementi/supplements, Trening/training — plus meal-photo analysis and ingredient nutrition lookup), with per-member daily limits and per-gym monthly budget caps.

---

## 2. User Roles

There are three business roles. Note that a **coach or admin can also hold a personal member account** (a "dual role"), letting the same person track their own fitness with the member app while managing clients with the staff app.

| Role | Serbian context | What they can do | Where they log in |
|------|-----------------|------------------|-------------------|
| **Member** | Član | Log meals/training/water, view the Home dashboard, chat with AI agents, log custom metrics, complete the weekly check-in, view progress & history, join challenges, vote on community goals, set a personal nutrition goal, and manage their difficulty mode. | `/login` — select gym, enter **Member ID** (6 chars) + **4-digit PIN** |
| **Coach / Staff** | Trener | See a dashboard of **assigned** clients with computed status, send nudges, write per-client AI knowledge, create meals & metrics for clients, schedule sessions, and assign/request clients. Coaches see only members assigned to them. **Can also maintain a personal member account** ("Moj nalog"). | `/staff-login` — select gym, enter **Staff ID** (`S-XXXX`) + **4-digit PIN** |
| **Gym Owner / Admin** | Admin / Vlasnik | **Admin:** full management of one gym — members, staff, subscriptions, branding, public site, challenges, goals, QR check-in, shared-meal approval. **Owner:** cross-location super-admin restricted in the UI to **Locations** and **Magacin** (inventory). | `/staff-login` (same as staff); routed by role — owner → Locations, admin → manage portal |

**Role internals (for reference):** the login system issues one JWT with a `userType` of either `member` or `staff`. The three business roles (`coach`, `admin`, `owner`) live on the staff record. Member-facing pages accept both members and staff (because staff may have a linked member account); staff-only pages require a staff session.

---

## 3. How a Person Becomes a Member (and How the Pieces Connect)

### Onboarding flow

A member does **not** self-register. The gym creates the account, then hands the member their credentials.

```
  GYM SIGNS UP                MEMBER IS CREATED             MEMBER LOGS IN
  (owner, Stripe)             (admin or coach)              (member app)
 ┌──────────────┐    pays    ┌──────────────────┐  gives   ┌────────────────┐
 │ Gym Portal   │ ─────────▶ │ Admin registers  │ ──────▶  │ /login         │
 │ registration │  activates │ member: name +   │  ID+PIN  │ pick gym →     │
 │ + subscription│           │ goal → system    │  + QR    │ Member ID +    │
 └──────────────┘            │ generates Member │          │ 4-digit PIN    │
                             │ ID + PIN + QR    │          └───────┬────────┘
                             └──────────────────┘                  │
                                                                   ▼
                                                        ┌────────────────────┐
                                                        │ Onboarding gate     │
                                                        │ "Zašto ovo          │
                                                        │  funkcioniše"       │
                                                        │ then → Home         │
                                                        └────────────────────┘
```

1. **The gym signs up** through the Gym Portal, pays via Stripe, and its subscription becomes active.
2. **An admin (or a coach) registers the member** in the portal with a name and nutrition goal. The system generates a unique **Member ID**, a **4-digit PIN** (bcrypt-hashed), and a login **QR code**, and shows the plaintext credentials **once**.
3. **The member logs in** at `/login`: they pick their gym, enter the Member ID and PIN, and land in the member app. First-time members pass through an onboarding explainer ("Zašto ovo funkcioniše" — "Why this works") before reaching Home.

### How the pieces connect

Once a member is active, their everyday activity flows through the whole system:

```
  Member logs                 Coach sees it              Coach responds
  meals / training / water    on their dashboard         via staff app
      │                            │                          │
      ▼                            ▼                          ▼
  ┌─────────────┐   feeds    ┌──────────────┐   triggers  ┌──────────────────┐
  │ Home        │ ─────────▶ │ Activity     │ ──────────▶ │ Nudges, coach     │
  │ dashboard,  │            │ status,      │             │ meals & metrics,  │
  │ consistency │            │ alerts,      │             │ AI "knowledge",   │
  │ & streaks   │            │ consistency  │             │ session proposals │
  └─────┬───────┘            └──────────────┘             └────────┬─────────┘
        │                                                          │
        │  same logs also earn points                              │  member & coach
        ▼                                                          ▼  negotiate times
  ┌─────────────────────────┐                          ┌──────────────────────┐
  │ Challenges & leaderboard │                          │ Session scheduling    │
  │ (training points require │                          │ (turn-based accept /  │
  │  a same-day QR check-in) │                          │  counter / confirm)   │
  └─────────────────────────┘                          └──────────────────────┘
```

- **Logging → dashboard:** each meal/training/water log updates the member's Home dashboard, weekly consistency score, and streak.
- **Logging → coach visibility:** the same logs give the assigned coach a computed activity status (on track / slipping / off track) plus alerts.
- **Coach → member:** the coach reacts with **nudges** (one-way accountability messages), **coach-created meals and metrics**, and per-agent **AI knowledge** injected into the member's AI chats.
- **Sessions:** member and coach negotiate one-on-one training sessions in a turn-based propose → counter → confirm flow (a Pro-tier feature).
- **Challenges & check-ins:** logging also earns challenge points; **training points require a same-day gym QR check-in** (a daily-rotating code) to prove physical presence.
- **Goals:** admins publish community goals; members vote on equipment options, and a winning option moves into a fundraising phase that fills automatically as memberships are renewed.

---

## 4. Where to Go Next

| Guide | For whom | What's inside |
|-------|----------|---------------|
| [Getting Started](./getting-started.md) | Developers / operators | Local setup, database, environment variables, running the app, and testing. |
| [Member Guide](./member-guide.md) | Members | Logging, difficulty modes, the Home dashboard, AI agents, metrics, check-ins, progress & history, challenges, and goals. |
| [Coach Guide](./coach-guide.md) | Coaches & staff | The client dashboard, nudges, AI knowledge, coach meals & metrics, client assignment, and session scheduling. |
| [Admin Guide](./admin-guide.md) | Gym owners & admins | Member & staff management, subscriptions & tiers, branding & public site, challenges, goals, QR check-in, and the Magacin inventory / POS. |

### Reference material

- [Database Schema Reference](./DATABASE.md) — the full 39-model Prisma data model.
- [SRS Summary](../SRS_SUMMARY.md) — summarized functional and non-functional requirements.
- [Project README](../README.md) — project front door: overview, feature list, and quickstart.
- [Deployment Guide](../DEPLOYMENT_GUIDE.md) — deploying across local and production (Vercel + Neon).

---

**Tech at a glance:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · PostgreSQL via Prisma (Neon serverless) · Anthropic Claude · custom JWT auth (jose) + bcrypt PINs · Stripe (gym subscriptions) · Vercel Blob storage · Recharts · Vitest.
