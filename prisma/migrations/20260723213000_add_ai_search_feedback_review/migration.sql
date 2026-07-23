ALTER TABLE "AiSearchEvent"
ADD COLUMN "answerHash" TEXT,
ADD COLUMN "feedbackQuerySnapshot" TEXT,
ADD COLUMN "feedbackAnswerSnapshot" TEXT,
ADD COLUMN "feedbackSnapshotStatus" TEXT,
ADD COLUMN "feedbackReviewStatus" TEXT,
ADD COLUMN "feedbackReviewNotes" TEXT,
ADD COLUMN "feedbackReviewedAt" TIMESTAMP(3),
ADD COLUMN "feedbackReviewedBy" TEXT;

CREATE INDEX "AiSearchEvent_feedbackReviewStatus_feedbackCreatedAt_idx"
ON "AiSearchEvent"("feedbackReviewStatus", "feedbackCreatedAt");

CREATE TABLE "AiSearchEvalCase" (
    "id" TEXT NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "expectedBehavior" TEXT NOT NULL,
    "expectedIntent" TEXT,
    "appointmentAvailability" BOOLEAN,
    "expectedCode" TEXT,
    "expectedSourceUrl" TEXT,
    "requiredAnswerPhrases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "forbiddenAnswerPhrases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSearchEvalCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiSearchEvalCase_sourceEventId_key"
ON "AiSearchEvalCase"("sourceEventId");

CREATE INDEX "AiSearchEvalCase_isActive_createdAt_idx"
ON "AiSearchEvalCase"("isActive", "createdAt");

ALTER TABLE "AiSearchEvalCase"
ADD CONSTRAINT "AiSearchEvalCase_sourceEventId_fkey"
FOREIGN KEY ("sourceEventId") REFERENCES "AiSearchEvent"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
