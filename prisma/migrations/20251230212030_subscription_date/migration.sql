/*
  Warnings:

  - You are about to drop the column `subscriptionEndDate` on the `members` table. All the data in the column will be lost.
  - You are about to drop the column `trialEndDate` on the `members` table. All the data in the column will be lost.
  - You are about to drop the column `trialStartDate` on the `members` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "members" DROP COLUMN "subscriptionEndDate",
DROP COLUMN "trialEndDate",
DROP COLUMN "trialStartDate",
ADD COLUMN     "subscribedAt" TIMESTAMP(3),
ADD COLUMN     "subscribedUntil" TIMESTAMP(3),
ALTER COLUMN "subscriptionStatus" SET DEFAULT 'active';
