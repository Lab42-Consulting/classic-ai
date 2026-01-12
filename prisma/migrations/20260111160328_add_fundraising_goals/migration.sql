-- CreateTable
CREATE TABLE "fundraising_goals" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" INTEGER NOT NULL,
    "currentAmount" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fundraising_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fundraising_contributions" (
    "id" TEXT NOT NULL,
    "fundraisingGoalId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "memberId" TEXT,
    "memberName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fundraising_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fundraising_goals_gymId_idx" ON "fundraising_goals"("gymId");

-- CreateIndex
CREATE INDEX "fundraising_goals_gymId_status_idx" ON "fundraising_goals"("gymId", "status");

-- CreateIndex
CREATE INDEX "fundraising_goals_gymId_isVisible_status_idx" ON "fundraising_goals"("gymId", "isVisible", "status");

-- CreateIndex
CREATE INDEX "fundraising_contributions_fundraisingGoalId_idx" ON "fundraising_contributions"("fundraisingGoalId");

-- CreateIndex
CREATE INDEX "fundraising_contributions_fundraisingGoalId_createdAt_idx" ON "fundraising_contributions"("fundraisingGoalId", "createdAt");

-- AddForeignKey
ALTER TABLE "fundraising_goals" ADD CONSTRAINT "fundraising_goals_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fundraising_contributions" ADD CONSTRAINT "fundraising_contributions_fundraisingGoalId_fkey" FOREIGN KEY ("fundraisingGoalId") REFERENCES "fundraising_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
