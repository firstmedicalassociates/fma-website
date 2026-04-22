-- AlterTable
ALTER TABLE "Provider"
ADD COLUMN "imageAlt" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eyebrow" TEXT,
    "accent" TEXT,
    "intro" TEXT,
    "address" TEXT NOT NULL,
    "displayAddress" TEXT,
    "phone" TEXT,
    "directionsUrl" TEXT,
    "bookingUrl" TEXT,
    "mapImageUrl" TEXT,
    "mapImageAlt" TEXT,
    "parkingTitle" TEXT,
    "parkingDescription" TEXT,
    "officeHours" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "services" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");

-- CreateIndex
CREATE INDEX "Location_updatedAt_idx" ON "Location"("updatedAt");

-- CreateIndex
CREATE INDEX "Provider_isActive_sortOrder_name_idx" ON "Provider"("isActive", "sortOrder", "name");
