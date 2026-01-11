-- AlterTable
ALTER TABLE "ai_usage_daily" ADD COLUMN     "photoAnalyses" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "difficultyMode" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN     "onboardingPath" TEXT;
