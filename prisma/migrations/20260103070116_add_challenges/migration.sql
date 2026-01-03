-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rewardDescription" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "joinDeadlineDays" INTEGER NOT NULL DEFAULT 7,
    "winnerCount" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "pointsPerMeal" INTEGER NOT NULL DEFAULT 5,
    "pointsPerTraining" INTEGER NOT NULL DEFAULT 15,
    "pointsPerWater" INTEGER NOT NULL DEFAULT 1,
    "pointsPerCheckin" INTEGER NOT NULL DEFAULT 25,
    "streakBonus" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_participants" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "mealPoints" INTEGER NOT NULL DEFAULT 0,
    "trainingPoints" INTEGER NOT NULL DEFAULT 0,
    "waterPoints" INTEGER NOT NULL DEFAULT 0,
    "checkinPoints" INTEGER NOT NULL DEFAULT 0,
    "streakPoints" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "challenges_gymId_idx" ON "challenges"("gymId");

-- CreateIndex
CREATE INDEX "challenges_gymId_status_idx" ON "challenges"("gymId", "status");

-- CreateIndex
CREATE INDEX "challenges_startDate_endDate_idx" ON "challenges"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "challenge_participants_challengeId_idx" ON "challenge_participants"("challengeId");

-- CreateIndex
CREATE INDEX "challenge_participants_memberId_idx" ON "challenge_participants"("memberId");

-- CreateIndex
CREATE INDEX "challenge_participants_challengeId_totalPoints_idx" ON "challenge_participants"("challengeId", "totalPoints");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_participants_challengeId_memberId_key" ON "challenge_participants"("challengeId", "memberId");

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
