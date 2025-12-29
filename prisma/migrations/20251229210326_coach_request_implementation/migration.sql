-- CreateTable
CREATE TABLE "coach_requests" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "customGoal" TEXT,
    "customCalories" INTEGER,
    "customProtein" INTEGER,
    "customCarbs" INTEGER,
    "customFats" INTEGER,
    "notes" TEXT,
    "requireExactMacros" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coach_requests_memberId_key" ON "coach_requests"("memberId");

-- CreateIndex
CREATE INDEX "coach_requests_staffId_idx" ON "coach_requests"("staffId");

-- CreateIndex
CREATE INDEX "coach_requests_memberId_idx" ON "coach_requests"("memberId");

-- AddForeignKey
ALTER TABLE "coach_requests" ADD CONSTRAINT "coach_requests_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_requests" ADD CONSTRAINT "coach_requests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
