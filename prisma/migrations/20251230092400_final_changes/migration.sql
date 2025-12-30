-- DropIndex
DROP INDEX "custom_meals_gymId_isShared_idx";

-- AlterTable
ALTER TABLE "custom_meals" ADD COLUMN     "shareApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareRequestedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "custom_meals_gymId_isShared_shareApproved_idx" ON "custom_meals"("gymId", "isShared", "shareApproved");
