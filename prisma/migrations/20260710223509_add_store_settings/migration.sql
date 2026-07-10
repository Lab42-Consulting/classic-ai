-- AlterTable
ALTER TABLE "gyms" ADD COLUMN     "storeContactPhone" TEXT,
ADD COLUMN     "storeDeliveryFeeRsd" INTEGER,
ADD COLUMN     "storeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "storeFreeDeliveryThresholdRsd" INTEGER,
ADD COLUMN     "storeNote" TEXT,
ADD COLUMN     "storePickupAddress" TEXT;

