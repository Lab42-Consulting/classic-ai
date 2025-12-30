# Database Management Guide

This document covers database migrations, schema changes, and backup strategies for the Classic AI application using Prisma with Neon PostgreSQL.

---

## Table of Contents

1. [Development vs Production Commands](#development-vs-production-commands)
2. [Safe Schema Changes](#safe-schema-changes)
3. [Risky Schema Changes](#risky-schema-changes)
4. [Migration Workflow](#migration-workflow)
5. [Backup Strategies](#backup-strategies)
6. [Pre-Migration Checklist](#pre-migration-checklist)
7. [Emergency Recovery](#emergency-recovery)

---

## Development vs Production Commands

### Development Only (Can Cause Data Loss)

```bash
# Syncs schema directly - can DROP tables/columns
npx prisma db push

# Completely resets database and re-seeds
npx prisma migrate reset

# Force push ignoring warnings
npx prisma db push --force-reset
```

**Never use these commands on production databases.**

### Production Safe

```bash
# Apply pending migrations (non-destructive)
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

---

## Safe Schema Changes

These changes will NOT cause data loss:

| Change | Example | Notes |
|--------|---------|-------|
| Add new table | `model NewTable { ... }` | No existing data affected |
| Add nullable column | `newField String?` | Existing rows get `NULL` |
| Add column with default | `isActive Boolean @default(true)` | Existing rows get default value |
| Add optional relation | `posts Post[]` | No data migration needed |
| Add index | `@@index([email])` | Performance only, no data change |
| Make required field optional | `name String` → `name String?` | Loosening constraints is safe |

### Example: Adding a New Field Safely

```prisma
// schema.prisma

model Member {
  id        String   @id @default(cuid())
  name      String
  email     String?  // NEW: nullable = safe
  isVIP     Boolean  @default(false)  // NEW: has default = safe
}
```

```bash
npx prisma migrate dev --name add_member_email_and_vip
```

---

## Risky Schema Changes

These changes require careful handling:

| Change | Risk | Solution |
|--------|------|----------|
| Rename column | Data loss | Custom SQL migration |
| Rename table | Data loss | Custom SQL migration |
| Change column type | Data loss/corruption | Custom SQL with data transformation |
| Make nullable required | Fails if NULLs exist | Backfill data first |
| Remove column | Data loss | Backup first, confirm not needed |
| Remove table | Data loss | Backup first, confirm not needed |

### Example: Renaming a Column

**Don't let Prisma auto-generate this - it will DROP and CREATE!**

```bash
# Create migration without applying
npx prisma migrate dev --name rename_member_id_to_code --create-only
```

Edit the generated SQL file in `prisma/migrations/xxx_rename_member_id_to_code/migration.sql`:

```sql
-- Instead of:
-- ALTER TABLE "members" DROP COLUMN "memberId";
-- ALTER TABLE "members" ADD COLUMN "memberCode" TEXT;

-- Use:
ALTER TABLE "members" RENAME COLUMN "memberId" TO "memberCode";
```

Then apply:

```bash
npx prisma migrate dev
```

### Example: Making a Nullable Field Required

```bash
# 1. First, backfill existing NULL values
npx prisma db execute --stdin <<EOF
UPDATE members SET email = 'unknown@example.com' WHERE email IS NULL;
EOF

# 2. Now it's safe to make it required
# Change schema: email String? → email String
npx prisma migrate dev --name make_email_required
```

---

## Migration Workflow

### For Development

```bash
# 1. Make changes to schema.prisma
# 2. Create and apply migration
npx prisma migrate dev --name descriptive_name

# 3. If you made a mistake, reset and try again
npx prisma migrate reset
```

### For Production (Vercel/Neon)

```bash
# Migrations are applied automatically on deploy via:
# postinstall script or build command that runs:
npx prisma migrate deploy
```

### Migration Files

Migrations are stored in `prisma/migrations/`:

```
prisma/
  migrations/
    20241201120000_initial/
      migration.sql
    20241215143000_add_coach_request/
      migration.sql
    migration_lock.toml
  schema.prisma
```

**Always commit migration files to git!**

---

## Backup Strategies

### 1. Neon Built-in Protection (Automatic)

Neon provides:
- **Point-in-time recovery**: Restore to any point in last 7 days (Free) or 30 days (Pro)
- **Instant branching**: Create database copies for testing

#### Creating a Branch Before Risky Changes

Via Neon Console:
1. Go to your project → Branches
2. Click "Create Branch"
3. Name it `backup-before-migration-YYYYMMDD`

Via CLI:
```bash
# Install Neon CLI
npm install -g neonctl

# Authenticate
neonctl auth

# Create branch
neonctl branches create --name backup-before-migration
```

### 2. Manual pg_dump (Most Portable)

```bash
# Export entire database
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql

# Export specific tables
pg_dump "$DATABASE_URL" -t members -t daily_logs > partial_backup.sql

# Compressed backup
pg_dump "$DATABASE_URL" | gzip > backup_$(date +%Y%m%d).sql.gz
```

#### Restoring from Backup

```bash
# Restore to same database (careful!)
psql "$DATABASE_URL" < backup_20241229.sql

# Restore to a different database
psql "$NEW_DATABASE_URL" < backup_20241229.sql
```

### 3. Add Backup Script to package.json

```json
{
  "scripts": {
    "db:backup": "pg_dump $DATABASE_URL > backups/backup_$(date +%Y%m%d_%H%M%S).sql",
    "db:backup:gz": "pg_dump $DATABASE_URL | gzip > backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz"
  }
}
```

Create backups directory:
```bash
mkdir -p backups
echo "*.sql" >> backups/.gitignore
echo "*.gz" >> backups/.gitignore
```

---

## Pre-Migration Checklist

Before any production schema change:

### 1. Analyze the Change

- [ ] Is this a safe change (additive, nullable, has default)?
- [ ] Does this require custom SQL?
- [ ] Will this affect existing queries/code?

### 2. Prepare Backup

- [ ] Create Neon branch: `backup-YYYYMMDD-description`
- [ ] Or run `npm run db:backup`

### 3. Test on Branch First

```bash
# Create Neon branch for testing
neonctl branches create --name test-migration

# Get the new branch connection string from Neon console
# Update .env.local temporarily
DATABASE_URL="postgresql://...@test-migration..."

# Apply migration to test branch
npx prisma migrate deploy

# Test the application
npm run dev

# If successful, switch back to main and apply
```

### 4. Apply to Production

```bash
# On Vercel, migrations apply automatically on deploy
git add prisma/migrations
git commit -m "Add migration: description"
git push
```

### 5. Verify

- [ ] Check Vercel deployment logs for migration success
- [ ] Test critical flows in production
- [ ] Keep backup branch for 48-72 hours

---

## Emergency Recovery

### If Migration Fails on Deploy

1. **Check Vercel logs** for the specific error
2. **Fix the migration SQL** if it's a syntax issue
3. **If data is corrupted:**
   - Use Neon point-in-time recovery
   - Or restore from Neon branch

### Neon Point-in-Time Recovery

1. Go to Neon Console → Your Project → Branches
2. Click "Restore" on main branch
3. Select timestamp before the issue
4. Confirm restore

### Restore from Branch

```bash
# Get connection strings
MAIN_DB="postgresql://...@main..."
BACKUP_DB="postgresql://...@backup-branch..."

# Export from backup branch
pg_dump "$BACKUP_DB" > recovery.sql

# Restore to main (after fixing schema)
psql "$MAIN_DB" < recovery.sql
```

---

## Common Scenarios

### Scenario 1: Adding a New Feature Table

```prisma
// Safe - just add the new model
model Notification {
  id        String   @id @default(cuid())
  memberId  String
  message   String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  member    Member   @relation(fields: [memberId], references: [id])
}
```

```bash
npx prisma migrate dev --name add_notifications
git add prisma/migrations
git commit -m "Add notifications table"
git push
```

### Scenario 2: Adding a Required Field to Existing Table

```bash
# Step 1: Add as nullable first
# schema: newField String?
npx prisma migrate dev --name add_new_field_nullable

# Step 2: Backfill data
npx prisma db execute --stdin <<EOF
UPDATE members SET newField = 'default_value' WHERE newField IS NULL;
EOF

# Step 3: Make required
# schema: newField String
npx prisma migrate dev --name make_new_field_required
```

### Scenario 3: Removing a Column

```bash
# 1. Create Neon backup branch first!

# 2. Remove from schema and create migration
npx prisma migrate dev --name remove_old_column

# 3. Deploy (data in that column is now gone)
git push
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Create migration (dev) | `npx prisma migrate dev --name description` |
| Apply migrations (prod) | `npx prisma migrate deploy` |
| Reset database (dev only) | `npx prisma migrate reset` |
| View migration status | `npx prisma migrate status` |
| Create migration SQL only | `npx prisma migrate dev --create-only` |
| Generate client | `npx prisma generate` |
| Open Prisma Studio | `npx prisma studio` |
| Manual backup | `pg_dump $DATABASE_URL > backup.sql` |

---

## Resources

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Neon Branching Guide](https://neon.tech/docs/introduction/branching)
- [Neon Point-in-Time Recovery](https://neon.tech/docs/introduction/point-in-time-restore)
