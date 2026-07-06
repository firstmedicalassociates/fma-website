CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "SearchEmbedding" (
  "id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "embedding" vector(1536),
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SearchEmbedding_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SearchEmbedding"
  ADD COLUMN IF NOT EXISTS "content" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "embedding" vector(1536),
  ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "SearchEmbedding"
  ALTER COLUMN "content" DROP DEFAULT,
  ALTER COLUMN "metadata" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE INDEX IF NOT EXISTS "SearchEmbedding_createdAt_idx"
  ON "SearchEmbedding"("createdAt");

CREATE INDEX IF NOT EXISTS "SearchEmbedding_embedding_hnsw_idx"
  ON "SearchEmbedding" USING hnsw ("embedding" vector_cosine_ops)
  WHERE "embedding" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "SearchEmbedding_metadata_type_idx"
  ON "SearchEmbedding" ((metadata->>'type'));
