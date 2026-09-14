BEGIN;

-- Existing schema.prisma uses Service.icon, but the historical migrations omitted it.
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "icon" TEXT NOT NULL DEFAULT 'medical_services';

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "AiSearchEvent" ADD COLUMN     "availabilityStatus" TEXT,
ADD COLUMN     "bookingTargetCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "telemetryVersion" INTEGER;

-- CreateTable
CREATE TABLE "AiSearchInteraction" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSearchInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiApiUsage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "purpose" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "requestId" TEXT,
    "inputTokens" INTEGER,
    "cachedInputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCostUsd" DECIMAL(20,10),
    "pricingVersion" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiApiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenAiCostSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpenAiCostSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminCredentialAttempt" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminCredentialAttempt_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "AiSearchInteraction_eventId_type_idx" ON "AiSearchInteraction"("eventId", "type");

-- CreateIndex
CREATE INDEX "AiSearchInteraction_createdAt_type_idx" ON "AiSearchInteraction"("createdAt", "type");

-- CreateIndex
CREATE INDEX "AiApiUsage_eventId_idx" ON "AiApiUsage"("eventId");

-- CreateIndex
CREATE INDEX "AiApiUsage_createdAt_purpose_idx" ON "AiApiUsage"("createdAt", "purpose");

-- CreateIndex
CREATE INDEX "AdminCredentialAttempt_expiresAt_idx" ON "AdminCredentialAttempt"("expiresAt");

-- CreateIndex
CREATE INDEX "AiSearchEvent_surface_createdAt_idx" ON "AiSearchEvent"("surface", "createdAt");

-- AddForeignKey
ALTER TABLE "AiSearchInteraction" ADD CONSTRAINT "AiSearchInteraction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AiSearchEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiApiUsage" ADD CONSTRAINT "AiApiUsage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AiSearchEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Reject case-insensitive duplicates before normalizing existing logins.
CREATE UNIQUE INDEX "AdminUser_email_lower_key" ON "AdminUser" (lower(trim(email)));
UPDATE "AdminUser" SET email = lower(trim(email));

COMMIT;
