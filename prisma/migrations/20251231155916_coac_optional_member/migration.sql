/*
  Warnings:

  - A unique constraint covering the columns `[linkedMemberId]` on the table `staff` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "linkedMemberId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "staff_linkedMemberId_key" ON "staff"("linkedMemberId");

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_linkedMemberId_fkey" FOREIGN KEY ("linkedMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
