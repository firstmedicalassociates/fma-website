ALTER TABLE "AiSearchEvent"
ADD COLUMN "searchRoute" TEXT,
ADD COLUMN "promptVersion" TEXT,
ADD COLUMN "modelVersion" TEXT,
ADD COLUMN "knowledgeVersion" TEXT,
ADD COLUMN "sourceRefs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "retrievalScore" DOUBLE PRECISION;

CREATE INDEX "AiSearchEvent_searchRoute_createdAt_idx"
ON "AiSearchEvent"("searchRoute", "createdAt");

CREATE INDEX "AiSearchEvent_promptVersion_createdAt_idx"
ON "AiSearchEvent"("promptVersion", "createdAt");
