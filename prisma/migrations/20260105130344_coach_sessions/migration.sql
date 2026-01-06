-- CreateTable
CREATE TABLE "session_requests" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "note" TEXT,
    "initiatedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "counterCount" INTEGER NOT NULL DEFAULT 0,
    "lastActionBy" TEXT,
    "lastActionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_proposals" (
    "id" TEXT NOT NULL,
    "sessionRequestId" TEXT NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "note" TEXT,
    "response" TEXT,
    "responseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_sessions" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "note" TEXT,
    "originalRequestId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_requests_staffId_idx" ON "session_requests"("staffId");

-- CreateIndex
CREATE INDEX "session_requests_memberId_idx" ON "session_requests"("memberId");

-- CreateIndex
CREATE INDEX "session_requests_status_idx" ON "session_requests"("status");

-- CreateIndex
CREATE INDEX "session_requests_staffId_status_idx" ON "session_requests"("staffId", "status");

-- CreateIndex
CREATE INDEX "session_requests_memberId_status_idx" ON "session_requests"("memberId", "status");

-- CreateIndex
CREATE INDEX "session_proposals_sessionRequestId_idx" ON "session_proposals"("sessionRequestId");

-- CreateIndex
CREATE INDEX "scheduled_sessions_staffId_idx" ON "scheduled_sessions"("staffId");

-- CreateIndex
CREATE INDEX "scheduled_sessions_memberId_idx" ON "scheduled_sessions"("memberId");

-- CreateIndex
CREATE INDEX "scheduled_sessions_scheduledAt_idx" ON "scheduled_sessions"("scheduledAt");

-- CreateIndex
CREATE INDEX "scheduled_sessions_status_idx" ON "scheduled_sessions"("status");

-- CreateIndex
CREATE INDEX "scheduled_sessions_staffId_status_scheduledAt_idx" ON "scheduled_sessions"("staffId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "scheduled_sessions_memberId_status_scheduledAt_idx" ON "scheduled_sessions"("memberId", "status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "session_requests" ADD CONSTRAINT "session_requests_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_requests" ADD CONSTRAINT "session_requests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_proposals" ADD CONSTRAINT "session_proposals_sessionRequestId_fkey" FOREIGN KEY ("sessionRequestId") REFERENCES "session_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_sessions" ADD CONSTRAINT "scheduled_sessions_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_sessions" ADD CONSTRAINT "scheduled_sessions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
