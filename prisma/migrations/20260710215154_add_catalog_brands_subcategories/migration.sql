-- AlterTable
ALTER TABLE "product_categories" ADD COLUMN     "displayOrder" INTEGER,
ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "brandId" TEXT,
ADD COLUMN     "displayOrder" INTEGER,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVisibleOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slug" TEXT;

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brands_gymId_idx" ON "brands"("gymId");

-- CreateIndex
CREATE UNIQUE INDEX "brands_gymId_name_key" ON "brands"("gymId", "name");

-- CreateIndex
CREATE INDEX "product_categories_gymId_parentId_idx" ON "product_categories"("gymId", "parentId");

-- CreateIndex
CREATE INDEX "products_gymId_isVisibleOnline_idx" ON "products"("gymId", "isVisibleOnline");

-- CreateIndex
CREATE INDEX "products_gymId_brandId_idx" ON "products"("gymId", "brandId");

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

