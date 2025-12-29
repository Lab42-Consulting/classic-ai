-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "agentType" TEXT;

-- CreateTable
CREATE TABLE "coach_knowledge" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coach_knowledge_staffId_idx" ON "coach_knowledge"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "coach_knowledge_staffId_agentType_key" ON "coach_knowledge"("staffId", "agentType");

-- CreateIndex
CREATE INDEX "chat_messages_memberId_agentType_createdAt_idx" ON "chat_messages"("memberId", "agentType", "createdAt");

-- AddForeignKey
ALTER TABLE "coach_knowledge" ADD CONSTRAINT "coach_knowledge_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
