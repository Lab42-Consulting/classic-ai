-- AlterTable
ALTER TABLE "gyms" ADD COLUMN     "aiMonthlyBudget" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ai_response_cache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 1,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_response_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_daily" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usage_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_monthly" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "totalTokensIn" INTEGER NOT NULL DEFAULT 0,
    "totalTokensOut" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usage_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_response_cache_cacheKey_key" ON "ai_response_cache"("cacheKey");

-- CreateIndex
CREATE INDEX "ai_response_cache_cacheKey_idx" ON "ai_response_cache"("cacheKey");

-- CreateIndex
CREATE INDEX "ai_response_cache_lastUsedAt_idx" ON "ai_response_cache"("lastUsedAt");

-- CreateIndex
CREATE INDEX "ai_usage_daily_memberId_idx" ON "ai_usage_daily"("memberId");

-- CreateIndex
CREATE INDEX "ai_usage_daily_date_idx" ON "ai_usage_daily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_daily_memberId_date_key" ON "ai_usage_daily"("memberId", "date");

-- CreateIndex
CREATE INDEX "ai_usage_monthly_gymId_idx" ON "ai_usage_monthly"("gymId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_monthly_gymId_year_month_key" ON "ai_usage_monthly"("gymId", "year", "month");

-- AddForeignKey
ALTER TABLE "ai_usage_monthly" ADD CONSTRAINT "ai_usage_monthly_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
