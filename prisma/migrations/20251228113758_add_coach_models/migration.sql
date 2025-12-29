-- CreateTable
CREATE TABLE "coach_assignments" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customGoal" TEXT,
    "customCalories" INTEGER,
    "customProtein" INTEGER,
    "customCarbs" INTEGER,
    "customFats" INTEGER,
    "notes" TEXT,

    CONSTRAINT "coach_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_nudges" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "coach_nudges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coach_assignments_staffId_idx" ON "coach_assignments"("staffId");

-- CreateIndex
CREATE INDEX "coach_assignments_memberId_idx" ON "coach_assignments"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "coach_assignments_memberId_key" ON "coach_assignments"("memberId");

-- CreateIndex
CREATE INDEX "coach_nudges_staffId_idx" ON "coach_nudges"("staffId");

-- CreateIndex
CREATE INDEX "coach_nudges_memberId_idx" ON "coach_nudges"("memberId");

-- CreateIndex
CREATE INDEX "coach_nudges_memberId_seenAt_idx" ON "coach_nudges"("memberId", "seenAt");

-- AddForeignKey
ALTER TABLE "coach_assignments" ADD CONSTRAINT "coach_assignments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_assignments" ADD CONSTRAINT "coach_assignments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_nudges" ADD CONSTRAINT "coach_nudges_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_nudges" ADD CONSTRAINT "coach_nudges_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
