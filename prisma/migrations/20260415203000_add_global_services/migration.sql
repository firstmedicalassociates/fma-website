CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General Care',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Location"
ADD COLUMN "serviceIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TEMP TABLE "_LocationLegacyServices" AS
SELECT
    CONCAT('legacy-service-', MD5(location."id" || ':' || legacy_service."ordinality"::TEXT)) AS "id",
    location."id" AS "locationId",
    COALESCE(NULLIF(TRIM(legacy_service."value"->>'category'), ''), 'General Care') AS "category",
    NULLIF(TRIM(legacy_service."value"->>'title'), '') AS "title",
    NULLIF(TRIM(legacy_service."value"->>'description'), '') AS "description",
    (legacy_service."ordinality"::INTEGER - 1) AS "sortOrder"
FROM "Location" location
CROSS JOIN LATERAL JSONB_ARRAY_ELEMENTS(
    CASE
        WHEN JSONB_TYPEOF(COALESCE(location."services", '[]'::JSONB)) = 'array'
            THEN COALESCE(location."services", '[]'::JSONB)
        ELSE '[]'::JSONB
    END
) WITH ORDINALITY AS legacy_service("value", "ordinality");

INSERT INTO "Service" (
    "id",
    "category",
    "title",
    "description",
    "sortOrder",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "category",
    "title",
    "description",
    "sortOrder",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "_LocationLegacyServices"
WHERE "title" IS NOT NULL
    AND "description" IS NOT NULL;

UPDATE "Location"
SET "serviceIds" = migrated."serviceIds"
FROM (
    SELECT
        "locationId",
        ARRAY_AGG("id" ORDER BY "sortOrder", "id") AS "serviceIds"
    FROM "_LocationLegacyServices"
    WHERE "title" IS NOT NULL
        AND "description" IS NOT NULL
    GROUP BY "locationId"
) migrated
WHERE "Location"."id" = migrated."locationId";

DROP TABLE "_LocationLegacyServices";

CREATE INDEX "Service_isActive_sortOrder_title_idx" ON "Service"("isActive", "sortOrder", "title");
CREATE INDEX "Service_category_sortOrder_title_idx" ON "Service"("category", "sortOrder", "title");
