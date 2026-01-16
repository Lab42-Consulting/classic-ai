-- CreateTable
CREATE TABLE "custom_metrics" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdByCoachId" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION,
    "referenceValue" DOUBLE PRECISION,
    "higherIsBetter" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_entries" (
    "id" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_metrics_memberId_idx" ON "custom_metrics"("memberId");

-- CreateIndex
CREATE INDEX "custom_metrics_memberId_createdByCoachId_idx" ON "custom_metrics"("memberId", "createdByCoachId");

-- CreateIndex
CREATE INDEX "metric_entries_metricId_date_idx" ON "metric_entries"("metricId", "date");

-- CreateIndex
CREATE INDEX "metric_entries_memberId_date_idx" ON "metric_entries"("memberId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "metric_entries_metricId_date_key" ON "metric_entries"("metricId", "date");

-- AddForeignKey
ALTER TABLE "custom_metrics" ADD CONSTRAINT "custom_metrics_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_metrics" ADD CONSTRAINT "custom_metrics_createdByCoachId_fkey" FOREIGN KEY ("createdByCoachId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_entries" ADD CONSTRAINT "metric_entries_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "custom_metrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
