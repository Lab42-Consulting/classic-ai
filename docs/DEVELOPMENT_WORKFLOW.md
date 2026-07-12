# Development & Release Workflow

How to make a change and ship it safely — from a feature branch to production.

## The pipeline (TL;DR)

```
feature branch
   → change code (+ schema)
   → migrate DEV (local DB)
   → test locally (tsc + tests + build)
   → open PR to main
   → CI green (typecheck + tests + build)
   → merge to main
   → migrate PROD                    ⚠️  Vercel does NOT run migrations
   → Vercel auto-deploys main → production
```

> **Golden rule:** `main` auto-deploys to Vercel **production**, and the build (`next build`) does **not** run migrations. So any schema change must have its migration applied to production **before (or at the moment of) merging** — otherwise the freshly-deployed code will query columns/tables that don't exist yet.

---

## 1. Branch

```bash
git checkout main && git pull
git checkout -b feat/my-change      # or fix/… , chore/…
```

- `main` = production (protected by convention; every change goes through a PR).
- For a **large, multi-PR feature** (like the storefront), use a long-lived **integration branch** (e.g. `feat/storefront`): each sub-task PRs into it, and the whole thing is promoted to `main` with one final PR once complete.

## 2. Make the change

Write the code. If you touch the **database schema** (`prisma/schema.prisma`), generate a migration and apply it to your **local** dev DB:

```bash
# Normal case — creates the migration folder AND applies it to the local DB:
npm run db:migrate:local -- --name short_description_of_change

# Then regenerate the Prisma client types:
npx prisma generate
```

If `migrate dev` refuses because your local DB has drift (e.g. old experimental migrations that aren't in git), generate the SQL **without touching any database**, then apply it:

```bash
git show origin/main:prisma/schema.prisma > /tmp/old.prisma
TS=$(date +%Y%m%d%H%M%S)
mkdir -p prisma/migrations/${TS}_my_change
npx prisma migrate diff \
  --from-schema-datamodel /tmp/old.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/${TS}_my_change/migration.sql
npx prisma generate
# apply to local without a reset:
dotenv -e .env.local -- prisma migrate deploy
```

**Migrations must be additive / backward-compatible** ("expand" pattern): add nullable columns or new tables so the *old* code keeps working during the deploy window. Avoid dropping/renaming columns in the same release as the code that stops using them.

## 3. Write tests

- API/logic tests live in `tests/`. Prisma, auth, AI and Blob are mocked (`tests/setup.ts`) — no real DB needed.
- Add or update tests for the behavior you changed.

## 4. Verify locally

```bash
npx tsc --noEmit     # types
npm run test:run     # unit/API tests (also runs on every commit via the pre-commit hook)
npm run build        # production build (type-checks the app graph)
```

All three must pass. (The pre-commit hook runs the test suite automatically.)

## 5. Open a PR → wait for green

```bash
git push -u origin feat/my-change
gh pr create --base main --fill
```

CI (`.github/workflows/ci.yml`) runs on every PR: `npm ci → prisma generate → tsc --noEmit → test → build`. **Wait for the "Build & Test" check to pass** before merging.

## 6. Merge

Squash-merge into `main`. This triggers a Vercel **production** deploy.

## 7. Apply migrations to production

Because Vercel doesn't migrate, run this yourself from a machine that can reach the Neon database (or use the Neon SQL editor — see below). For an **additive** migration, do it **before** merging (safe either way):

```bash
npm run db:migrate:prod        # → Neon production DB (uses .env.production)
```

`migrate deploy` only applies migrations that aren't recorded yet; it never resets. **Never** run `migrate dev` against prod.

### If `migrate deploy` can't reach Neon

If you get `P1001: Can't reach database server …neon.tech`, your network can't open a direct connection to Neon (some networks block port 5432, or the branch is suspended). Options:
- Run it from a network/host that can reach Neon (or after un-suspending the branch in the Neon console).
- **Fallback:** open the **Neon Console → SQL Editor** for that database and paste the contents of each pending `prisma/migrations/<timestamp>_*/migration.sql` (in timestamp order), then run them.

---

## Environments & config

| File | Used by | Purpose |
| --- | --- | --- |
| `.env.local` | local dev (`npm run dev`) | localhost Postgres + dev keys |
| `.env.production` | Vercel **Production** | Neon prod DB |

The Prisma client selects the DB automatically at runtime (`lib/db`): local dev uses `DEV_DATABASE_URL`/localhost, everything on Vercel uses `DATABASE_URL`. Branch strategy: `main` → Production.

### Is there a staging database?

**No — the project uses local + production only.** A permanent staging environment was intentionally dropped as overkill for a single-gym app. Two consequences to know:

- **Vercel Preview deployments use the production database** (there's no separate preview DB). If you don't want PR previews touching prod data, disable Preview deployments in Vercel → Settings.
- **Rehearse risky migrations with an ephemeral Neon branch** instead: Neon → Branches → New branch from `production`, run `prisma migrate deploy` against its connection string, verify, then delete the branch. Nothing permanent to maintain.

## CI

`.github/workflows/ci.yml` runs on every PR and on push to `main`: install → `prisma generate` → `tsc --noEmit` → `npm run test:run` → `npm run build`. Keep it green.

## Quick reference

| Task | Command |
| --- | --- |
| Start local app | `npm run dev` → http://localhost:3000 |
| New migration (local) | `npm run db:migrate:local -- --name x` |
| Apply migrations (prod) | `npm run db:migrate:prod` |
| Types / tests / build | `npx tsc --noEmit` · `npm run test:run` · `npm run build` |
| Seed local data | `npm run db:seed:local` |
