-- AlterTable
ALTER TABLE "custom_meals" ADD COLUMN     "createdByCoachId" TEXT;

-- AddForeignKey
ALTER TABLE "custom_meals" ADD CONSTRAINT "custom_meals_createdByCoachId_fkey" FOREIGN KEY ("createdByCoachId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
