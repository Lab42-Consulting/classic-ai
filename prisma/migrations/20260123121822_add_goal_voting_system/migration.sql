-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "votingEndsAt" TIMESTAMP(3),
    "winningOptionId" TEXT,
    "currentAmount" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "votingEndedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_options" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "targetAmount" INTEGER NOT NULL,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_votes" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_contributions" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "memberId" TEXT,
    "memberName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_gymId_idx" ON "goals"("gymId");

-- CreateIndex
CREATE INDEX "goals_gymId_status_idx" ON "goals"("gymId", "status");

-- CreateIndex
CREATE INDEX "goals_gymId_isVisible_status_idx" ON "goals"("gymId", "isVisible", "status");

-- CreateIndex
CREATE INDEX "goal_options_goalId_idx" ON "goal_options"("goalId");

-- CreateIndex
CREATE INDEX "goal_options_goalId_voteCount_idx" ON "goal_options"("goalId", "voteCount");

-- CreateIndex
CREATE INDEX "goal_votes_goalId_idx" ON "goal_votes"("goalId");

-- CreateIndex
CREATE INDEX "goal_votes_optionId_idx" ON "goal_votes"("optionId");

-- CreateIndex
CREATE INDEX "goal_votes_memberId_idx" ON "goal_votes"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "goal_votes_goalId_memberId_key" ON "goal_votes"("goalId", "memberId");

-- CreateIndex
CREATE INDEX "goal_contributions_goalId_idx" ON "goal_contributions"("goalId");

-- CreateIndex
CREATE INDEX "goal_contributions_goalId_createdAt_idx" ON "goal_contributions"("goalId", "createdAt");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_options" ADD CONSTRAINT "goal_options_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_votes" ADD CONSTRAINT "goal_votes_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_votes" ADD CONSTRAINT "goal_votes_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "goal_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data Migration: Transfer existing fundraising goals to new goals system
-- Each old goal becomes a single-option goal in fundraising status

-- Step 1: Insert existing fundraising goals as new goals
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fundraising_goals') THEN
    INSERT INTO "goals" ("id", "gymId", "name", "description", "status", "currentAmount", "isVisible", "createdAt", "updatedAt", "completedAt")
    SELECT
      "id",
      "gymId",
      "name",
      "description",
      CASE
        WHEN "status" = 'active' THEN 'fundraising'
        WHEN "status" = 'completed' THEN 'completed'
        ELSE "status"
      END,
      "currentAmount",
      true,
      "createdAt",
      "updatedAt",
      "completedAt"
    FROM "fundraising_goals";
  END IF;
END $$;

-- Step 2: Create a single option for each migrated goal
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fundraising_goals') THEN
    INSERT INTO "goal_options" ("id", "goalId", "name", "description", "targetAmount", "displayOrder", "createdAt")
    SELECT
      gen_random_uuid()::text,
      "id",
      "name",
      "description",
      "targetAmount",
      0,
      "createdAt"
    FROM "fundraising_goals";
  END IF;
END $$;

-- Step 3: Set the winning option for each migrated goal (for fundraising goals)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fundraising_goals') THEN
    UPDATE "goals" g SET "winningOptionId" = (
      SELECT "id" FROM "goal_options" WHERE "goalId" = g."id" LIMIT 1
    )
    WHERE g."status" IN ('fundraising', 'completed');
  END IF;
END $$;

-- Step 4: Migrate existing contributions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fundraising_contributions') THEN
    INSERT INTO "goal_contributions" ("id", "goalId", "amount", "source", "memberId", "memberName", "note", "createdAt")
    SELECT
      "id",
      "fundraisingGoalId",
      "amount",
      "source",
      "memberId",
      "memberName",
      "note",
      "createdAt"
    FROM "fundraising_contributions";
  END IF;
END $$;
