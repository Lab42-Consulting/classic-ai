# Getting Started

A developer setup guide for the **Classic Method Gym Intelligence System** — a multi-tenant (per-gym) SaaS built with Next.js 16, Prisma/PostgreSQL, and the Anthropic Claude API. This page covers local installation, environment variables, database setup, running the app, and testing.

> The application UI is **Serbian (ekavica)** by default, with English as a secondary locale. This guide is written for developers in English; Serbian UI terms are called out where useful.

For a full production deployment walkthrough (Vercel + Neon environments), see [../DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md).

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Node.js 20+** | The project targets `@types/node` 20 and Next.js 16.1.1. |
| **npm** | Used for all scripts (`package.json`). |
| **PostgreSQL database** | A local PostgreSQL instance **or** a [Neon](https://neon.tech) serverless Postgres branch. The Prisma client auto-selects the driver: `localhost`/`127.0.0.1` connections use the standard PrismaClient; all other (cloud) connection strings use the Neon serverless adapter over WebSockets. |
| **Anthropic API key** | Required for all AI features (agent chat, meal-photo analysis, ingredient deduction). Model used everywhere: `claude-3-haiku-20240307`. Get one at [console.anthropic.com](https://console.anthropic.com/settings/keys). |
| **Stripe account** *(optional)* | Only needed to exercise B2B gym subscription checkout/webhooks. The app runs fine without it — member-facing features and the €5/month member membership are not Stripe-integrated. |
| **Vercel Blob token** *(optional)* | Only needed if you want image uploads (avatars, meal photos, gym logos) to persist to Vercel Blob storage instead of falling back to inline base64. |

---

## Installation

1. **Clone the repository** and enter the project directory:

   ```bash
   git clone <repository-url>
   cd classic-ai
   ```

2. **Install dependencies.** The `postinstall` script automatically runs `prisma generate` to build the Prisma client:

   ```bash
   npm install
   ```

3. **Create your local environment file.** Copy the example and fill in real values:

   ```bash
   cp .env.example .env.local
   ```

   The `dev` script loads `.env.local` (via `dotenv -e .env.local`), so this is the file your local dev server reads. See [Environment Variables](#environment-variables) below.

> **Env file convention:** local development uses `.env.local` and production uses `.env.production`. The `db:*` scripts pick the matching file per environment (see [Database](#database)).

---

## Environment Variables

Start from `.env.example`. The most important variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Primary Postgres connection string. Also the fallback for `DEV_DATABASE_URL` when it is unset. In production (and Vercel Preview deployments) it is the production database. |
| `DEV_DATABASE_URL` | Recommended | Local-development database. Used when `NODE_ENV=development` and not running on Vercel. Falls back to `DATABASE_URL` if unset. |
| `JWT_SECRET` | Yes | Secret for signing session JWTs (jose, HS256), stored in the httpOnly `gym-session` cookie. **Minimum 32 characters**; use a different value per environment. Generate with `openssl rand -base64 32`. If unset, the code falls back to an insecure hardcoded secret — never rely on that outside local dev. |
| `ANTHROPIC_API_KEY` | Yes (for AI) | Anthropic Claude API key powering AI agents, meal-photo vision, and ingredient deduction. |
| `NEXT_PUBLIC_APP_URL` | Yes | Public base URL of the app, no trailing slash (`http://localhost:3000` locally). |
| `NODE_ENV` | Yes | `development` locally; `production` on Vercel. Drives database selection and Prisma query logging. |
| `STRIPE_SECRET_KEY` | Optional | Stripe secret key for gym-subscription checkout and tier changes (use `sk_test_...` locally). |
| `STRIPE_WEBHOOK_SECRET` | Optional | Verifies incoming Stripe webhook signatures (`whsec_...`). |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Publishable Stripe key exposed to the browser (`pk_test_...`). |
| `BLOB_READ_WRITE_TOKEN` | Optional | Vercel Blob read/write token for persisting uploaded images. Without it, small images fall back to base64 storage in the database. |
| `SENTRY_DSN` / `SENTRY_AUTH_TOKEN` | Optional | Error monitoring, if configured. |

**Minimum viable local setup:** `DEV_DATABASE_URL` (or `DATABASE_URL`), `JWT_SECRET`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_APP_URL`, and `NODE_ENV=development`. Stripe and Blob variables can be left as placeholders until you need those flows.

---

## Database

The schema lives in `prisma/schema.prisma` (39 models; PostgreSQL, all tenant data scoped by `gymId` with cascade deletes). Migrations are tracked under `prisma/migrations/`.

### Push vs. migrate

There are two ways to get the schema into your database:

- **`npm run db:push`** — runs `prisma db push`. Syncs the schema directly to the database **without creating a migration file**. Fast and convenient for iterating locally on a throwaway dev database.
- **`npm run db:migrate`** — runs `prisma migrate dev`. Creates and applies a versioned migration under `prisma/migrations/`. Use this when you change the schema and want the change committed to git for production.

Environment-scoped variants load the matching env file:

| Command | Env file | Underlying action |
|---------|----------|-------------------|
| `npm run db:push:local` | `.env.local` | `prisma db push` |
| `npm run db:push:prod` | `.env.production` | `prisma db push` |
| `npm run db:migrate:local` | `.env.local` | `prisma migrate dev` (creates a migration) |
| `npm run db:migrate:prod` | `.env.production` | `prisma migrate deploy` (non-destructive) |

> Production uses `migrate deploy` (apply committed migrations only), never `migrate dev`. Migrations must be committed to git before deploying.

### Seeding

`npm run db:seed` runs `prisma/seed.ts` (via `tsx`). It creates a realistic demo tenant so you can log in immediately:

- **Gym:** `Classic Gym Bulevar` — Pro tier, subscription active.
- **Owner:** Staff ID `STRUJA`, PIN `1234`.
- **Admin:** Staff ID `S-ADMIN`, PIN `1234`.
- **Coaches:** `MANJA` (PIN `5678`), `GATI` (PIN `1357`), `NINA` (PIN `2468`).
- **Members:** a full roster (e.g. `MJ01` / PIN `1001`, `AN02` / PIN `1002`, …) assigned across the coaches, with generated daily logs, weekly check-ins, and weight progressions. Members span active, trial, and expired subscription states to exercise the subscription gates.

The seed also pre-populates the AI response cache (`seedCacheIfEmpty`) with canonical prompts.

Environment-scoped seed variants use the `TARGET_DB` env var to explicitly select the target database:

| Command | Target |
|---------|--------|
| `npm run db:seed:local` | `TARGET_DB=dev`, `.env.local` |
| `npm run db:seed:prod` | `.env.production`, runs `prisma/seed-prod.ts` (a minimal production seed) |
| `npm run db:seed-gym` | Runs `prisma/seed-gym.ts` (a standalone single-gym seed) |

### Inspecting and resetting

- **`npm run db:studio`** — opens Prisma Studio, a browser GUI for the database. Env-scoped variants: `db:studio:local`, `db:studio:prod`.
- **`npm run db:reset`** — runs `prisma migrate reset`, which **drops and recreates** the database, reapplies migrations, and reseeds. Env-scoped variants exist; `db:reset:prod` prints a loud danger warning first. Never run a reset against a database you care about.

### Typical first-time local flow

1. Ensure `DEV_DATABASE_URL` (or `DATABASE_URL`) points at your local/dev Postgres.
2. Apply the schema:
   ```bash
   npm run db:push:local
   ```
3. Seed demo data:
   ```bash
   npm run db:seed:local
   ```
4. (Optional) Verify with Prisma Studio:
   ```bash
   npm run db:studio:local
   ```

---

## Running the App

| Command | What it does |
|---------|--------------|
| `npm run dev` | Starts the Next.js dev server (`next dev --webpack`) with `.env.local` loaded. Serves at `http://localhost:3000`. |
| `npm run build` | Production build (`next build`). |
| `npm run start` | Serves the production build (`next start`). Run `npm run build` first. |
| `npm run lint` | Runs ESLint (`eslint-config-next`). |

Once the dev server is up, open [http://localhost:3000](http://localhost:3000). The root path redirects to `/gym-portal` (the public marketing/entry surface). To sign in with seeded accounts:

- **Members** log in at `/login`: select the gym `Classic Gym Bulevar`, enter a Member ID (e.g. `MJ01`) and PIN (e.g. `1001`).
- **Staff** (owner/admin/coach) log in at `/staff-login`: select the gym, enter a Staff ID (e.g. `S-ADMIN`) and PIN (`1234`). Owners route to the Locations page, admins to the manage portal, coaches to the dashboard.

---

## Testing

Tests use **Vitest 4** with happy-dom and a fully mocked Prisma/auth/AI/Blob layer (`tests/setup.ts`). There are 17 API/lib test files covering routes and library logic against fixtures — no live database or API keys are required to run them.

| Command | What it does |
|---------|--------------|
| `npm run test` | Runs Vitest in watch mode. |
| `npm run test:run` | Runs the suite once and exits (use in CI). |
| `npm run test:coverage` | Single run with a v8 coverage report over `app/api/**/*.ts` and `lib/**/*.ts`. |
| `npm run test:ui` | Opens the Vitest interactive UI. |

Test config lives in `vitest.config.ts`. The global setup mocks all Prisma models (including `$transaction`), auth helpers, the AI cache/rate limiter, subscription guards, the Anthropic SDK, Vercel Blob, and QRCode, so tests are deterministic and offline.

---

## Environment & Database Selection

The app chooses its database **automatically at runtime** based on `NODE_ENV` and Vercel's `VERCEL_ENV` (`lib/db/index.ts`). You do not switch databases manually in application code — you only provide the right connection strings per environment.

| Runtime context | Condition | Connection string used |
|-----------------|-----------|------------------------|
| **Local development** | `NODE_ENV=development` and **not** on Vercel (`VERCEL_ENV` unset) | `DEV_DATABASE_URL` → falls back to `DATABASE_URL` |
| **Vercel (Production and Preview)** | running on Vercel (`VERCEL_ENV` set) | `DATABASE_URL` (the production database — there is no separate preview/staging database) |

Additional runtime behavior:

- **Driver selection:** if the resolved connection string contains `localhost` or `127.0.0.1`, a plain `PrismaClient` is used. Otherwise the **Neon serverless adapter** (`PrismaNeon`) is used with a connection pool (max 10, idle timeout 30s, connect timeout 10s) over WebSockets.
- **Missing config throws early:** if the resolved environment's URL is unset (and no `DATABASE_URL` fallback exists), the client throws a descriptive error naming the required variable.
- **HMR safety:** in non-production the Prisma instance is cached on `globalThis` so hot reloads don't exhaust connections. Query logging is enabled only in development.

The `db:seed*` scripts use a separate, explicit selector: the `TARGET_DB` env var (`dev` | `prod`), falling back to `NODE_ENV`-based selection when unset. This is why the seed commands set `TARGET_DB` explicitly.

---

## Next Steps

- **Deploying to Vercel + Neon (all three environments):** [../DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)
- **Database schema reference:** [./DATABASE.md](./DATABASE.md)
- **Project overview and feature map:** [../README.md](../README.md)
- **Role-specific workflows:** [member guide](./member-guide.md), [coach guide](./coach-guide.md), [admin guide](./admin-guide.md)
