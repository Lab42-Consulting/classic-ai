-- AlterTable
ALTER TABLE "gyms" ADD COLUMN     "address" TEXT,
ADD COLUMN     "ownerEmail" TEXT,
ADD COLUMN     "ownerName" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "primaryColor" TEXT,
ADD COLUMN     "secondaryColor" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscribedAt" TIMESTAMP(3),
ADD COLUMN     "subscribedUntil" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" TEXT NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "subscription_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousEndDate" TIMESTAMP(3),
    "newEndDate" TIMESTAMP(3),
    "months" INTEGER,
    "amount" DOUBLE PRECISION,
    "notes" TEXT,
    "performedBy" TEXT,
    "performedByType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_logs_entityType_entityId_idx" ON "subscription_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "subscription_logs_createdAt_idx" ON "subscription_logs"("createdAt");

-- CreateIndex
CREATE INDEX "gyms_subscriptionStatus_idx" ON "gyms"("subscriptionStatus");

-- CreateIndex
CREATE INDEX "gyms_stripeCustomerId_idx" ON "gyms"("stripeCustomerId");
