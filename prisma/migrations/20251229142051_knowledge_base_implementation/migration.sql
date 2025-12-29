/*
  Warnings:

  - A unique constraint covering the columns `[staffId,memberId,agentType]` on the table `coach_knowledge` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `memberId` to the `coach_knowledge` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "coach_knowledge_staffId_agentType_key";

-- AlterTable
ALTER TABLE "coach_knowledge" ADD COLUMN     "memberId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "coach_knowledge_memberId_idx" ON "coach_knowledge"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "coach_knowledge_staffId_memberId_agentType_key" ON "coach_knowledge"("staffId", "memberId", "agentType");

-- AddForeignKey
ALTER TABLE "coach_knowledge" ADD CONSTRAINT "coach_knowledge_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
