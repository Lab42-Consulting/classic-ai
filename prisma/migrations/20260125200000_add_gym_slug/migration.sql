-- AlterTable
ALTER TABLE "gyms" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "gyms_slug_key" ON "gyms"("slug");
