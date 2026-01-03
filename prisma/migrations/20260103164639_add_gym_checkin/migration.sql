-- AlterTable
ALTER TABLE "gyms" ADD COLUMN     "checkinSecret" TEXT;

-- CreateTable
CREATE TABLE "gym_checkins" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gym_checkins_memberId_idx" ON "gym_checkins"("memberId");

-- CreateIndex
CREATE INDEX "gym_checkins_gymId_idx" ON "gym_checkins"("gymId");

-- CreateIndex
CREATE INDEX "gym_checkins_memberId_date_idx" ON "gym_checkins"("memberId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "gym_checkins_memberId_date_key" ON "gym_checkins"("memberId", "date");

-- AddForeignKey
ALTER TABLE "gym_checkins" ADD CONSTRAINT "gym_checkins_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_checkins" ADD CONSTRAINT "gym_checkins_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
