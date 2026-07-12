# Deployment Guide - Classic Method Gym Intelligence System

A comprehensive guide for deploying and managing the application across its two environments (local and production) on Vercel.

---

## Table of Contents

1. [Environment Strategy](#1-environment-strategy)
2. [Vercel Project Setup](#2-vercel-project-setup)
3. [Database Strategy](#3-database-strategy)
4. [Environment Variables](#4-environment-variables)
5. [Deployment Workflow](#5-deployment-workflow)
6. [Database Migrations](#6-database-migrations)
7. [Backup & Recovery](#7-backup--recovery)
8. [Rollback Procedures](#8-rollback-procedures)
9. [Monitoring & Alerts](#9-monitoring--alerts)
10. [Checklist: Before Going Live](#10-checklist-before-going-live)

---

## 1. Environment Strategy

### Two Environments Only

This project runs **two environments: local and production**. There is no staging environment, no `develop` branch, and no dedicated staging database.

| Environment | Branch | Database | URL | Purpose |
|-------------|--------|----------|-----|---------|
| **LOCAL** | `feature/*` or `fix/*` | Local PostgreSQL (`localhost`) or a Neon dev branch via `DEV_DATABASE_URL` | http://localhost:3000 | Day-to-day development |
| **PRODUCTION** | `main` | Neon production DB (`DATABASE_URL`, with backups!) | https://classicmethod.app | Real users, real data |

### Vercel Preview Deployments (Important Caveat)

Vercel automatically creates a **Preview deployment** for every pull request / non-`main` branch. These are handy for reviewing changes in a real deployed build, but note the key caveat:

> There is **no separate preview/staging database**. Vercel Preview deployments connect to the **production database** (see the selection logic in [Section 3](#3-database-strategy)). Any writes a Preview build makes go to production data.

If that is a concern, **disable Preview deployments** in Vercel → **Settings → Git** (turn off automatic deployments for non-production branches), and review changes locally instead.

### How Changes Reach Production Safely

Because there is no staging buffer, the safety net is **CI + code review + manual migrations**:

| Concern | Mitigation |
|---------|------------|
| Breaking production | GitHub Actions CI must pass on every PR before it can be merged |
| Untested schema changes | Vercel never runs migrations; apply them manually and rehearse risky ones on an ephemeral Neon branch (see [Section 6](#6-database-migrations)) |
| Preview builds touching prod data | Preview uses the production DB — disable Preview deployments if this matters |

### Branch Strategy

```
main (production — Vercel auto-deploys on merge)
 │
 ├── feature/add-new-metric-type
 ├── feature/coach-dashboard-redesign
 ├── fix/login-timeout-issue
 └── hotfix/critical-security-patch
```

All work happens on short-lived branches created off `main`. Open a PR **to `main`**; once CI passes and the PR is approved, **squash-merge to `main`** and Vercel deploys production automatically. There is no `develop` branch.

---

## 2. Vercel Project Setup

This is a **single Vercel project**. `main` is the production branch; every other branch produces a Preview deployment.

**Step 1: Create / link the Vercel Project**

```bash
# Install Vercel CLI
npm install -g vercel

# Link your project
cd classic-ai
vercel link
```

**Step 2: Configure Branch Deployments**

In your Vercel Dashboard → Project Settings → Git:

| Setting | Value |
|---------|-------|
| Production Branch | `main` |
| Preview Branches | All other branches (or **disabled** — see the caveat in Section 1) |

**Step 3: Set Up Environment Variables**

In Vercel Dashboard → Project Settings → Environment Variables. Both the **Production** and **Preview** scopes read the same production values, because Preview uses the production database:

```
# Production (and Preview) — main branch and PR previews
DATABASE_URL          = postgresql://...@prod-db.../gym_production
ANTHROPIC_API_KEY     = sk-ant-prod-...
NEXT_PUBLIC_APP_URL   = https://classicmethod.app
JWT_SECRET            = <unique-production-secret>
```

Local development does **not** read these — it loads `.env.local` (see [Section 4](#4-environment-variables)).

**Step 4: Configure the Custom Domain**

In Vercel Dashboard → Project Settings → Domains:

```
classicmethod.app   → Production (main)
```

---

## 3. Database Strategy

### Database Provider Options

| Provider | Free Tier | Best For | Automatic Backups |
|----------|-----------|----------|-------------------|
| **Neon** | 0.5GB, 1 project | Development, dev branches, production | Yes (7 days) |
| **Supabase** | 500MB, 2 projects | Full-stack, realtime needs | Yes (7 days) |
| **Railway** | $5 credit/month | Simple setup | Manual |
| **PlanetScale** | 5GB (MySQL) | High scale | Yes |
| **AWS RDS** | 12 months free tier | Enterprise | Configurable |
| **DigitalOcean** | $15/month | Production reliability | Yes |

This project uses **Neon** for production (and, optionally, Neon dev branches for local work).

### Database Architecture

| Environment | Database | Connection String | Notes |
|-------------|----------|-------------------|-------|
| **LOCAL** | Local PostgreSQL install/Docker, or a Neon dev branch | `postgresql://postgres:postgres@localhost:5432/gym_dev` (or a Neon branch URL) | Set as `DEV_DATABASE_URL` in `.env.local` |
| **PRODUCTION** | Neon (production project) | `postgresql://user:pass@prod-host/gym_production` | Automatic daily backups, point-in-time recovery via Neon branching, connection pooling |

### This Project's Neon Setup (Already Configured)

This project uses the **Neon Serverless Driver** with Prisma's adapter pattern. Connection pooling is handled automatically by the adapter in `lib/db/index.ts`.

**Step 1: Create the Neon Project**

```bash
# Create one project in the Neon dashboard:
# 1. classic-method-production
#
# (Optional) create a dev branch off it for local work and use its
# connection string as DEV_DATABASE_URL.
```

**Step 2: Get the Connection String**

In Neon Dashboard → Connection Details → Copy the connection string:

```
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/gym_production?sslmode=require"
```

**How Connection Pooling Works (Already Implemented)**

Unlike standard Prisma setups, this project uses the `@prisma/adapter-neon` package which handles connection pooling automatically.

**Database Selection Logic (`lib/db/index.ts`):**

```typescript
// Database selection — two environments only:
// - Local development (NODE_ENV=development, NOT on Vercel): DEV_DATABASE_URL || DATABASE_URL
// - Everything on Vercel (production AND preview): DATABASE_URL
//   NOTE: there is no separate preview/staging DB, so Vercel Preview
//   deployments connect to the PRODUCTION database.

const isLocalDev =
  process.env.NODE_ENV === "development" && !process.env.VERCEL_ENV;

const connectionString = isLocalDev
  ? process.env.DEV_DATABASE_URL || process.env.DATABASE_URL
  : process.env.DATABASE_URL;

const adapter = new PrismaNeon({
  connectionString,
  max: 10,                        // Maximum connections in pool
  idleTimeoutMillis: 30000,       // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout for new connections
});
```

If the connection string points at `localhost`/`127.0.0.1`, the code falls back to the standard Prisma client (the Neon WebSocket adapter is only used for cloud databases). This means local dev needs `DEV_DATABASE_URL` (or `DATABASE_URL`); everything on Vercel uses `DATABASE_URL` — no separate `DIRECT_DATABASE_URL` needed.

### Database Branching (Neon Feature)

Neon supports instant database branching — create a copy of production to rehearse a risky migration without touching live data:

```bash
# Before a risky migration:
# 1. Create an ephemeral branch off production in the Neon dashboard
# 2. Run `prisma migrate deploy` against the branch and verify
# 3. If successful, apply the migration to production
# 4. Delete the branch
```

See [Section 6](#6-database-migrations) for the full migration workflow.

---

## 4. Environment Variables

### Complete Variable List

See `.env.example` for the complete list. Local development reads `.env.local`; production commands (and Vercel) read the production values (`.env.production` for the migration/seed scripts). Key variables:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/gym_production?sslmode=require"
DEV_DATABASE_URL="postgresql://user:pass@localhost:5432/gym_dev"  # Local only

# Authentication (unique to production; different from local dev!)
JWT_SECRET="minimum-32-character-secret-key-here"

# AI Services
ANTHROPIC_API_KEY="sk-ant-api03-..."

# Application URL
NEXT_PUBLIC_APP_URL="https://classicmethod.app"

# Payments (Stripe)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### Vercel Environment Variable Configuration

In the Vercel Dashboard, set variables for the **Production** and **Preview** scopes. Because Preview deployments use the production database, both scopes share the same `DATABASE_URL`:

| Variable | Production | Preview |
|----------|------------|---------|
| `DATABASE_URL` | prod-db-url | prod-db-url (same — no separate preview DB) |
| `JWT_SECRET` | prod-secret | prod-secret |
| `ANTHROPIC_API_KEY` | your-key | your-key |
| `NEXT_PUBLIC_APP_URL` | https://classicmethod.app | Vercel-generated preview URL |

**Note:** `NODE_ENV` is automatically set by Vercel to `production` for all deployments. The app uses `VERCEL_ENV` (also set by Vercel) to detect that it is running on Vercel at all; when it is, it always uses `DATABASE_URL`.

**Local (`.env.local`):** `DEV_DATABASE_URL` points at your local Postgres or Neon dev branch; use a JWT secret distinct from production. These values live only on your machine, not in Vercel.

---

## 5. Deployment Workflow

### Daily Development Flow

```bash
# 1. Create a feature branch off main
git checkout main
git pull origin main
git checkout -b feature/new-feature

# 2. Develop locally
npm run dev
# Make changes, test locally

# 3. Push and open a PR to main
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
# Open PR: feature/new-feature → main

# 4. Vercel automatically creates a Preview deployment
#    (uses the PRODUCTION database — see the caveat in Section 1)

# 5. GitHub Actions CI runs on the PR:
#    install → prisma generate → tsc --noEmit → test:run → build
#    CI must pass.

# 6. After CI passes and the PR is approved, squash-merge to main

# 7. Vercel auto-deploys main to production: https://classicmethod.app
```

### Deployment Checklist

Before squash-merging a PR to `main` (production):
- [ ] GitHub Actions CI is green (typecheck, tests, and build all pass)
- [ ] All tests pass locally (`npm run test:run`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Feature verified locally (and/or in the PR's Preview deployment, keeping the shared-prod-DB caveat in mind)
- [ ] Database migrations created and tested locally; risky ones rehearsed on a Neon branch
- [ ] Rollback plan documented (if applicable)
- [ ] Team notified of the deployment

### Continuous Integration (GitHub Actions)

CI is defined in `.github/workflows/ci.yml`. It runs on **every pull request** and on **pushes to `main`**, and it **must pass before a PR can be merged**. The pipeline:

```yaml
# .github/workflows/ci.yml (summary)
on:
  pull_request:
  push:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci                 # Install dependencies
      - run: npx prisma generate    # Generate Prisma client
      - run: npx tsc --noEmit       # Typecheck
      - run: npm run test:run       # Run tests (vitest)
      - run: npm run build          # Next.js build
```

CI uses dummy env values (the app renders dynamically and tests mock Prisma), so it needs no real database or secrets. Deployment itself is handled by Vercel, not by this workflow — merging to `main` is what triggers the production deploy.

---

## 6. Database Migrations

### Migration Safety Rules

1. **Never run untested migrations on production**
2. **Always backup before migrations**
3. **Rehearse risky migrations on an ephemeral Neon branch first**
4. **Make migrations reversible when possible**
5. **Deploy code before migrations that add columns**
6. **Deploy migrations before code that removes columns**

> **Vercel does NOT run migrations.** The build only runs `prisma generate` (via `postinstall`) and `next build`. All schema changes are applied to production **manually** with `npm run db:migrate:prod`.

### Safe Migration Workflow

| Step | Action | Command/Notes |
|------|--------|---------------|
| 1 | **Create migration locally** | `npm run db:migrate:local` (`dotenv -e .env.local -- prisma migrate dev`) — creates and applies the migration against your local DB |
| 2 | **Test locally** | Verify the migration applies cleanly, test app functionality, consider the rollback path |
| 3 | **(Risky changes) Rehearse on a Neon branch** | Create an ephemeral branch off production, run `prisma migrate deploy` against it, verify, then delete the branch. This replaces the old "test on a shared staging DB first" step. |
| 4 | **Backup production** | Create a manual backup in Neon, or: `pg_dump $PROD_DATABASE_URL > backup_$(date +%Y%m%d).sql` |
| 5 | **Apply migration to production** | `npm run db:migrate:prod` (runs `prisma migrate deploy` using `.env.production`; applies committed migrations only) |
| 6 | **Deploy code** | Squash-merge to `main`; Vercel auto-deploys. Order steps 5/6 per rules 5–6 above (add columns before code that uses them; remove columns after code stops using them). |
| 7 | **Verify production** | Check logs for errors, test critical paths, monitor for ~30 minutes |

### Types of Schema Changes

#### Safe Changes (Low Risk)

```prisma
// Adding a new optional column - SAFE
model Member {
  newField String?  // Nullable, no migration issues
}

// Adding a new table - SAFE
model NewFeature {
  id String @id @default(cuid())
  // ...
}

// Adding an index - SAFE (but may be slow on large tables)
@@index([newField])
```

#### Moderate Risk Changes

```prisma
// Adding a required column with default - MODERATE
model Member {
  newField String @default("default_value")
}

// Renaming a column - MODERATE (requires data migration)
// Old: firstName String
// New: name String
```

#### High Risk Changes

```prisma
// Removing a column - HIGH RISK
// - Ensure no code references it first
// - Deploy code changes BEFORE migration

// Changing column type - HIGH RISK
// - May lose data
// - Often requires multi-step migration

// Removing a table - HIGH RISK
// - Ensure complete backup
// - Verify no foreign keys reference it
```

### Running Migrations

**Local Development:**
```bash
# Create and apply a migration against the local DB
npm run db:migrate:local            # dotenv -e .env.local -- prisma migrate dev
# (or directly: npx prisma migrate dev --name description_of_change)

# Reset local database (WARNING: destroys all local data)
npm run db:reset:local
```

**Production:**
```bash
# Apply pending, committed migrations to production (does NOT create migrations)
npm run db:migrate:prod             # dotenv -e .env.production -- prisma migrate deploy

# Check migration status against a target DB
npx prisma migrate status
```

> **Never run `prisma migrate dev` against production.** `migrate dev` can generate/alter migrations and reset data; production only ever gets `prisma migrate deploy` (via `npm run db:migrate:prod`), which applies already-committed migrations.

### Vercel Build Does NOT Run Migrations

The relevant `package.json` scripts are:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "next build",
    "db:migrate:prod": "dotenv -e .env.production -- prisma migrate deploy"
  }
}
```

Vercel runs `postinstall` (`prisma generate`) and `build` (`next build`) — **no migrations**. Apply schema changes yourself with `npm run db:migrate:prod` before (or after, per the ordering rules) merging the code that depends on them:

```bash
# 1. Backup first
pg_dump $PROD_DATABASE_URL > backup_$(date +%Y%m%d).sql

# 2. Apply committed migrations to production
npm run db:migrate:prod

# 3. Ship the code (Vercel deploys on merge to main)
git push origin feature/my-change   # then open + squash-merge the PR
```

---

## 7. Backup & Recovery

### Backup Strategy Overview

| Backup Type | Frequency | Retention | When to Use |
|-------------|-----------|-----------|-------------|
| **Automated Backups** (Neon) | Daily | 7-30 days (depends on plan) | Automatic recovery from the provider dashboard |
| **Manual Backups** | Before risky operations | As needed | Before schema migrations, bulk data updates, major feature deployments |
| **Point-in-Time Recovery / Branching** | Continuous | Varies by plan | Neon: instant branching from a past point in time |

### Manual Backup Commands

```bash
# Export database to SQL file
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Export specific tables only
pg_dump $DATABASE_URL -t members -t daily_logs > members_backup.sql

# Compressed backup
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore from Backup

```bash
# Restore full database (WARNING: overwrites everything)
psql $DATABASE_URL < backup_20260120.sql

# Restore to a new database first (safer)
createdb gym_restored
psql gym_restored < backup_20260120.sql
# Verify data, then swap connections
```

### Using Neon Branching for Safe Operations

```bash
# Before a risky migration:

# 1. In Neon Dashboard: Create a branch from production
#    Name: pre-migration-backup-20260120

# 2. Run the migration on production

# 3. If something goes wrong:
#    - Point DATABASE_URL to the branch
#    - Investigate and fix
#    - Or restore from the branch

# 4. If successful:
#    - Delete the branch after 24-48 hours
```

---

## 8. Rollback Procedures

### Code Rollback (Vercel)

**Option 1: Vercel Dashboard**
1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

**Option 2: Git Revert**
```bash
# Revert the last commit
git revert HEAD
git push origin main

# Revert a specific commit
git revert <commit-hash>
git push origin main

# Hard reset (use with caution)
git reset --hard <known-good-commit>
git push --force origin main  # DANGEROUS: rewrites history
```

### Database Rollback

**If migration can be reversed:**
```bash
# Prisma doesn't have built-in rollback, but you can:

# 1. Create a new migration that undoes the change (locally)
npm run db:migrate:local            # prisma migrate dev --name revert_previous_change

# 2. Apply it to production
npm run db:migrate:prod             # prisma migrate deploy
```

**If migration cannot be reversed:**
```bash
# 1. Restore from backup
psql $DATABASE_URL < backup_before_migration.sql

# 2. Mark migrations as rolled back
# (You may need to manually update the _prisma_migrations table)

# 3. Redeploy the previous code version
```

### Rollback Decision Tree

**Is the issue critical (data loss, security, complete outage)?**

- **YES → Immediate rollback**
  - Revert code via the Vercel dashboard
  - Restore the database from backup if needed
  - Notify the team immediately

- **NO → Assess and plan**
  - Can it be fixed forward quickly (< 1 hour)?
    - YES → Deploy a hotfix
    - NO → Rollback and investigate
  - Is it affecting users significantly?
    - YES → Rollback
    - NO → Fix in the next deployment cycle

---

## 9. Monitoring & Alerts

### Vercel Built-in Monitoring

- **Analytics**: Page views, performance metrics
- **Logs**: Runtime logs (Functions → Logs)
- **Speed Insights**: Core Web Vitals

### Recommended: Add Error Tracking (Sentry)

**Step 1: Install Sentry**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Step 2: Configure Sentry**
```javascript
// sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",
});
```

**Step 3: Set Environment Variables**
```
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=... (for source maps)
```

### Health Check Endpoint

Already created at `app/api/health/route.ts`. This endpoint checks database connectivity and returns system status.

### Uptime Monitoring (Free Options)

| Service | Free Tier |
|---------|-----------|
| **UptimeRobot** | 50 monitors, 5-min intervals |
| **Checkly** | 5 checks, 10-min intervals |
| **Better Uptime** | 10 monitors |

Configure to ping:
- `https://classicmethod.app/api/health`

---

## 10. Checklist: Before Going Live

### Infrastructure Setup

- [ ] **Production database** created with:
  - [ ] Automatic daily backups enabled
  - [ ] Connection pooling enabled
  - [ ] SSL/TLS enforced
- [ ] **Vercel project** configured with:
  - [ ] Custom domain connected
  - [ ] SSL certificate active
  - [ ] Environment variables set for Production (and Preview)
  - [ ] Preview deployments consciously enabled or disabled (they use the prod DB)
- [ ] **DNS** configured correctly:
  - [ ] A/CNAME records pointing to Vercel
  - [ ] www redirect configured (if needed)

### Security

- [ ] **Secrets** are strong and correctly scoped:
  - [ ] `JWT_SECRET` is unique to production and different from local dev
  - [ ] At least 32 characters, randomly generated
- [ ] **API keys** secured:
  - [ ] Anthropic API key has spending limits
  - [ ] Stripe keys are correct (test vs live)
- [ ] **No secrets in code**:
  - [ ] `.env*` files are in `.gitignore`
  - [ ] No hardcoded credentials
- [ ] **Headers configured** (in `next.config.js`):
  - [ ] HTTPS enforced
  - [ ] Security headers (CSP, HSTS, etc.)

### Application

- [ ] **CI is green** (typecheck, tests, build)
- [ ] **Build succeeds** without errors
- [ ] **All pages load** correctly
- [ ] **Authentication works**:
  - [ ] Member login
  - [ ] Staff login
  - [ ] Session persistence
  - [ ] Logout
- [ ] **Critical features tested**:
  - [ ] Meal logging
  - [ ] Training logging
  - [ ] AI chat
  - [ ] Weekly check-in
- [ ] **Error handling** works (try triggering errors)

### Monitoring

- [ ] **Error tracking** configured (Sentry or similar)
- [ ] **Uptime monitoring** configured
- [ ] **Health check endpoint** responding
- [ ] **Alerts** configured (email/Slack for downtime)

### Documentation

- [ ] **Environment variables** documented
- [ ] **Deployment process** documented (this guide!)
- [ ] **Rollback procedure** understood by the team
- [ ] **On-call contacts** defined

### Final Verification

- [ ] Test the full user journey locally (or in a Preview deployment, mindful of the shared prod DB)
- [ ] Load test if expecting significant traffic
- [ ] Verify a backup can be restored
- [ ] Team briefed on the go-live plan

---

## Quick Reference Commands

```bash
# ============================================
# LOCAL DEVELOPMENT
# ============================================
npm run dev                          # Start dev server (reads .env.local)
npm run db:studio:local              # Database GUI (local)
npm run db:migrate:local             # Create + apply a migration locally

# ============================================
# CI (runs automatically on every PR)
# ============================================
npm run test:run                     # Run tests (as CI does)
npx tsc --noEmit                     # Typecheck (as CI does)
npm run build                        # Build (as CI does)

# ============================================
# PRODUCTION DEPLOYMENT
# ============================================
# 1. Backup first!
pg_dump $PROD_DATABASE_URL > backup_$(date +%Y%m%d).sql

# 2. Apply committed migrations to production (Vercel does NOT do this)
npm run db:migrate:prod              # prisma migrate deploy via .env.production

# 3. Deploy code: open a PR to main, let CI pass, then squash-merge.
#    Vercel auto-deploys main to https://classicmethod.app

# ============================================
# EMERGENCY ROLLBACK
# ============================================
# Via Vercel Dashboard: Deployments → Previous → Promote to Production

# Via Git:
git revert HEAD
git push origin main

# ============================================
# DATABASE RESTORE
# ============================================
psql $DATABASE_URL < backup_file.sql
```

---

## Summary

| Environment | Branch | Database | Purpose |
|-------------|--------|----------|---------|
| Local | `feature/*`, `fix/*` | localhost Postgres or Neon dev branch (`DEV_DATABASE_URL`) | Development |
| Production | `main` | Neon production DB (`DATABASE_URL`) | Live users |

Vercel Preview deployments are auto-created per PR but share the **production** database — there is no separate preview/staging DB.

**Golden Rules:**
1. Never deploy untested code to production — CI must pass before merge
2. Always backup before migrations
3. Rehearse risky migrations on an ephemeral Neon branch
4. Apply migrations manually with `npm run db:migrate:prod` (Vercel does not run them)
5. Have a rollback plan ready and monitor after every deployment

---

*Last updated: July 2026*
