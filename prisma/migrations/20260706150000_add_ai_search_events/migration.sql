CREATE TABLE "AiSearchEvent" (
    "id" TEXT NOT NULL,
    "queryHash" TEXT,
    "queryLength" INTEGER NOT NULL DEFAULT 0,
    "surface" TEXT NOT NULL DEFAULT 'api',
    "intent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "code" TEXT,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "appointmentOptionCount" INTEGER NOT NULL DEFAULT 0,
    "aiConfidence" TEXT,
    "grounded" BOOLEAN NOT NULL DEFAULT false,
    "disclaimer" BOOLEAN NOT NULL DEFAULT false,
    "latencyMs" INTEGER,
    "phiCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "feedbackRating" TEXT,
    "feedbackTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "feedbackCreatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSearchEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiSearchEvent_createdAt_idx" ON "AiSearchEvent"("createdAt");
CREATE INDEX "AiSearchEvent_status_createdAt_idx" ON "AiSearchEvent"("status", "createdAt");
CREATE INDEX "AiSearchEvent_code_createdAt_idx" ON "AiSearchEvent"("code", "createdAt");
CREATE INDEX "AiSearchEvent_intent_createdAt_idx" ON "AiSearchEvent"("intent", "createdAt");
CREATE INDEX "AiSearchEvent_feedbackRating_createdAt_idx" ON "AiSearchEvent"("feedbackRating", "createdAt");
