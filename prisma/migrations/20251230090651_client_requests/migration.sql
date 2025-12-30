-- AlterTable
ALTER TABLE "coach_requests" ADD COLUMN     "initiatedBy" TEXT NOT NULL DEFAULT 'coach',
ADD COLUMN     "memberFirstName" TEXT,
ADD COLUMN     "memberLastName" TEXT,
ADD COLUMN     "memberMessage" TEXT,
ADD COLUMN     "memberPhone" TEXT;
