-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "imageUrl" TEXT,
    "category" TEXT,
    "price" INTEGER NOT NULL,
    "costPrice" INTEGER,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "lowStockAlert" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_logs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "staffId" TEXT,
    "staffName" TEXT,
    "previousStock" INTEGER,
    "newStock" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "memberId" TEXT,
    "memberName" TEXT,
    "staffId" TEXT,
    "staffName" TEXT,
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_gymId_idx" ON "products"("gymId");

-- CreateIndex
CREATE INDEX "products_gymId_isActive_idx" ON "products"("gymId", "isActive");

-- CreateIndex
CREATE INDEX "products_gymId_category_idx" ON "products"("gymId", "category");

-- CreateIndex
CREATE INDEX "stock_logs_productId_idx" ON "stock_logs"("productId");

-- CreateIndex
CREATE INDEX "stock_logs_productId_createdAt_idx" ON "stock_logs"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "sales_productId_idx" ON "sales"("productId");

-- CreateIndex
CREATE INDEX "sales_gymId_idx" ON "sales"("gymId");

-- CreateIndex
CREATE INDEX "sales_gymId_createdAt_idx" ON "sales"("gymId", "createdAt");

-- CreateIndex
CREATE INDEX "sales_memberId_idx" ON "sales"("memberId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_logs" ADD CONSTRAINT "stock_logs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
