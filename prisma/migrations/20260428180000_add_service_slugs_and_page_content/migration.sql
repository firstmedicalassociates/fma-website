ALTER TABLE "Service"
ADD COLUMN "slug" TEXT,
ADD COLUMN "pageContent" JSONB;

UPDATE "Service"
SET "slug" = LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(COALESCE("title", ''), '[^a-zA-Z0-9]+', '-', 'g')));

WITH duplicate_slugs AS (
  SELECT
    "id",
    "slug",
    ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "createdAt", "id") AS row_num
  FROM "Service"
)
UPDATE "Service" AS target
SET "slug" = CONCAT(target."slug", '-', duplicate_slugs.row_num)
FROM duplicate_slugs
WHERE target."id" = duplicate_slugs."id"
  AND duplicate_slugs.row_num > 1;

UPDATE "Service"
SET "slug" = "id"
WHERE COALESCE("slug", '') = '';

ALTER TABLE "Service"
ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");
