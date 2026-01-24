-- AlterTable
ALTER TABLE "gyms" ADD COLUMN     "about" TEXT,
ADD COLUMN     "openingHours" TEXT;

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "showOnWebsite" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "specialty" TEXT;
