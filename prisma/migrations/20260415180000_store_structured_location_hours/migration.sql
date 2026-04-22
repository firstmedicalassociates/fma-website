-- Convert office hours from free-text rows to JSON so each saved row can carry
-- day, startTime, and endTime values for schema.org opening-hours output.
ALTER TABLE "Location"
ALTER COLUMN "officeHours" DROP DEFAULT;

ALTER TABLE "Location"
ALTER COLUMN "officeHours" TYPE JSONB
USING COALESCE(to_jsonb("officeHours"), '[]'::jsonb);

ALTER TABLE "Location"
ALTER COLUMN "officeHours" SET DEFAULT '[]'::jsonb;
