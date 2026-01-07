-- AlterTable
ALTER TABLE "challenges" ADD COLUMN     "excludeTopN" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "winnerCooldownMonths" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "challenge_winners" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "wonAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_winners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "challenge_winners_memberId_idx" ON "challenge_winners"("memberId");

-- CreateIndex
CREATE INDEX "challenge_winners_memberId_wonAt_idx" ON "challenge_winners"("memberId", "wonAt");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_winners_challengeId_memberId_key" ON "challenge_winners"("challengeId", "memberId");

-- AddForeignKey
ALTER TABLE "challenge_winners" ADD CONSTRAINT "challenge_winners_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_winners" ADD CONSTRAINT "challenge_winners_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
