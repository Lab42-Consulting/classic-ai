/*
  Warnings:

  - A unique constraint covering the columns `[memberId,gymId]` on the table `members` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[staffId,gymId]` on the table `staff` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "members_memberId_key";

-- DropIndex
DROP INDEX "staff_staffId_key";

-- AlterTable
ALTER TABLE "gyms" ADD COLUMN     "logo" TEXT;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'sr';

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'sr';

-- CreateIndex
CREATE UNIQUE INDEX "members_memberId_gymId_key" ON "members"("memberId", "gymId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_staffId_gymId_key" ON "staff"("staffId", "gymId");
