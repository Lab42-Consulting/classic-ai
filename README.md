# Classic Method — Gym Intelligence System

A multi-tenant SaaS platform that gives gyms a digital accountability and guidance layer for their members and staff. Built with **Next.js 16**, **TypeScript**, and **AI-powered coaching** (Anthropic Claude), with a Serbian-first (ekavica) interface.

## Overview

Classic Method is a per-gym (multi-tenant) gym management and member-engagement system built for the **Serbian fitness market**. The entire UI and all AI responses are in Serbian (ekavica dialect), with English as a secondary locale. It combines a low-friction member logging loop, AI nutrition/supplements/training assistants, coach tooling, a gym back-office portal, gamified challenges, and an owner-only inventory/point-of-sale module.

The platform serves three principal types, all resolved from a single JWT session:

- **Members** — log daily activity, track goals and metrics, chat with AI agents, join challenges.
- **Staff** — coaches (client management), admins (single-gym management), and owners (cross-gym super-admins).
- **Gyms** — tenants billed via Stripe on one of three subscription tiers (Starter / Pro / Elite).

## Key Features

### For Members
- Daily meal, training, and water logging with minimal friction
- Three per-member difficulty modes: **Simple**, **Standard**, **Pro** (adapts the logging screen and dashboard)
- Personalized daily calorie/macro targets (coach > custom > auto-calculated)
- AI agents for **Ishrana** (nutrition), **Suplementi** (supplements), and **Trening** (training)
- AI meal-photo analysis (Vision) and ingredient macro deduction
- Weekly check-ins (weight + feeling) and a progress dashboard with consistency scoring
- Custom metrics tracking with table and graph views (Recharts)
- QR-code gym check-ins that unlock challenge training points
- Challenge participation with leaderboards, streaks, and rewards
- Community goal voting and fundraising transparency

### For Coaches
- Dashboard of assigned clients with computed activity/consistency status
- One-way accountability nudges (custom or templated)
- Per-member AI "knowledge" injected into the member's AI agents
- Create custom meals and metrics on behalf of a member
- Request-based or direct client assignment
- Turn-based session scheduling (propose / counter / accept)

### For Admins & Owners
- Gym portal dashboard with subscription and member/staff stats
- Member lifecycle: create (with generated ID + PIN + login QR), list, detail, and membership extension
- Staff management with one-time generated credentials
- Public marketing site config: branding, colors, URL slug, gallery, opening hours
- Daily-rotating QR gym check-in administration
- Challenge and community-goal management (Pro+ tier)
- **Magacin** — owner-only inventory and point-of-sale (products, stock audit log, sales in RSD)
- Multi-location management for owners (locations linked by shared owner email)

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16.1 (App Router) |
| Language | TypeScript 5 · React 19.2 |
| Styling | Tailwind CSS 4 (dark mode default, mobile-first) |
| Database | PostgreSQL |
| ORM / Driver | Prisma 6.19 · `@prisma/adapter-neon` 7.2 · Neon serverless (WebSockets) |
| AI | Anthropic Claude API (`@anthropic-ai/sdk` 0.71) |
| Auth | Custom JWT (`jose` 6) + bcryptjs-hashed PINs, HTTP-only cookies |
| Payments | Stripe 20 (B2B gym subscriptions) |
| Image Storage | Vercel Blob 2 (base64 fallback for small images) |
| Charts / QR | Recharts 3 · `qrcode` |
| Testing | Vitest 4 + Testing Library + happy-dom |
| Hosting | Vercel (local / staging / production) |

## Documentation

Start here for a guided tour, then dive into the reference material:

| Document | What it covers |
|----------|----------------|
| [docs/README.md](docs/README.md) | User-guide index and "how the app works" overview |
| [docs/getting-started.md](docs/getting-started.md) | Local setup, database, running, and testing |
| [docs/member-guide.md](docs/member-guide.md) | Member workflows (logging, goals, metrics, challenges) |
| [docs/coach-guide.md](docs/coach-guide.md) | Coach/staff workflows |
| [docs/admin-guide.md](docs/admin-guide.md) | Gym owner/admin (gym portal) workflows |
| [SRS_SUMMARY.md](SRS_SUMMARY.md) | Summarized Software Requirements Specification |
| [SRS.md](SRS.md) | Full detailed SRS (deep reference) |
| [DOCUMENTATION.md](DOCUMENTATION.md) | Full technical + user documentation |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Vercel deployment instructions |
| [docs/DATABASE.md](docs/DATABASE.md) | Database schema reference |

## Getting Started

> For full details — prerequisites, environment variables, database setup, and testing — see **[docs/getting-started.md](docs/getting-started.md)**.

### Prerequisites
- Node.js 20+
- PostgreSQL database (or a [Neon](https://neon.tech) account)
- Anthropic API key

### Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env      # then fill in the required values

# 3. Set up the database
npm run db:push
npm run db:seed           # optional: seed test accounts

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Seeded test accounts: member `TEST01` / `1234`, trial member `TRL001` / `1234`, coach `S-COACH` / `1234`, admin `S-ADMIN` / `1234`.

### Required environment variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Production PostgreSQL connection string | Yes |
| `DEV_DATABASE_URL` | Local development database | No |
| `STAGING_DATABASE_URL` | Staging database (Vercel Preview) | No |
| `JWT_SECRET` | Secret for JWT sessions (min 32 chars, unique per env) | Yes |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | Yes |
| `NEXT_PUBLIC_APP_URL` | Application URL | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | No |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | No |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | No |

See [.env.example](.env.example) for the full list.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio |

## Project Structure

```
classic-ai/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login pages (member + staff)
│   ├── (member)/           # Member app (home, log, chat, metrics, challenge, …)
│   ├── (staff)/            # Coach dashboard and staff tools
│   ├── gym-portal/         # Admin/owner back-office portal
│   └── api/                # API routes (each self-authorizes)
├── components/             # React components
│   └── ui/                 # Reusable UI primitives (GlassCard, etc.)
├── lib/                    # Shared logic
│   ├── db/                 # Environment-aware Prisma client
│   ├── auth/               # JWT sessions + role resolution
│   ├── ai/                 # AI agents, caching, usage limits
│   ├── subscription/       # Tiers and feature guards
│   ├── challenges/         # Points and leaderboard logic
│   ├── goals/              # Voting and fundraising
│   └── calculations/       # Targets, consistency, streaks
├── prisma/                 # Schema, migrations, seed
├── tests/                  # Vitest suite (fully mocked Prisma/auth/AI/Blob)
└── docs/                   # User guides and references
```

## Database & Environment Selection

The application uses Prisma with the Neon serverless adapter. The database is chosen automatically at runtime based on `NODE_ENV` and `VERCEL_ENV`:

- **Local development** → `DEV_DATABASE_URL` (falls back to `DATABASE_URL`)
- **Vercel Preview / staging** → `STAGING_DATABASE_URL` (falls back to `DATABASE_URL`)
- **Vercel Production** → `DATABASE_URL`

When the resolved connection string points at `localhost`/`127.0.0.1`, a standard `PrismaClient` is used; otherwise the Neon adapter (pooled, WebSocket-based) is used. See [docs/DATABASE.md](docs/DATABASE.md) for the schema reference.

## Deployment

The application is built for Vercel with three environments (local, staging/preview, production), each backed by its own Neon database. Migrations are committed to git and applied in production via `prisma migrate deploy`.

- `main` branch → Production
- `development` branch → Preview / Staging

See **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** for full instructions.

## Localization

The application is localized for **Serbian (ekavica dialect)** as the primary language, with English as a secondary locale. All AI agents respond in Serbian, dates are formatted with the `sr-RS` locale, and the UI uses Serbian terminology throughout (e.g. *Ishrana*, *Suplementi*, *Trening*, *Magacin*). The active locale is stored per user and loaded on app start.

## License

Private — All rights reserved.
