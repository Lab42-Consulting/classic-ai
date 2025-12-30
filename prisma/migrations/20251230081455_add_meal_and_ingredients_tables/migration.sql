-- CreateTable
CREATE TABLE "custom_meals" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalCalories" INTEGER NOT NULL,
    "totalProtein" INTEGER,
    "totalCarbs" INTEGER,
    "totalFats" INTEGER,
    "isManualTotal" BOOLEAN NOT NULL DEFAULT false,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_ingredients" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultPortion" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein" INTEGER,
    "carbs" INTEGER,
    "fats" INTEGER,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_ingredients" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "savedIngredientId" TEXT,
    "name" TEXT NOT NULL,
    "portionSize" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein" INTEGER,
    "carbs" INTEGER,
    "fats" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_meals_memberId_idx" ON "custom_meals"("memberId");

-- CreateIndex
CREATE INDEX "custom_meals_gymId_isShared_idx" ON "custom_meals"("gymId", "isShared");

-- CreateIndex
CREATE INDEX "saved_ingredients_memberId_idx" ON "saved_ingredients"("memberId");

-- CreateIndex
CREATE INDEX "saved_ingredients_gymId_isShared_idx" ON "saved_ingredients"("gymId", "isShared");

-- CreateIndex
CREATE INDEX "meal_ingredients_mealId_idx" ON "meal_ingredients"("mealId");

-- AddForeignKey
ALTER TABLE "custom_meals" ADD CONSTRAINT "custom_meals_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_meals" ADD CONSTRAINT "custom_meals_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_ingredients" ADD CONSTRAINT "saved_ingredients_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_ingredients" ADD CONSTRAINT "saved_ingredients_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_ingredients" ADD CONSTRAINT "meal_ingredients_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "custom_meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
