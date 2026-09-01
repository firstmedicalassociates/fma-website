-- Rename the two secondary office routes without losing their existing CMS data.
UPDATE "Location"
SET "slug" = '/bowie-2'
WHERE "slug" = '/bowie-dev';

UPDATE "Location"
SET "slug" = '/columbia-2'
WHERE "slug" = '/columbia-dev';

-- Provider assignments store location slugs in a text array and must move with
-- the location records or the provider cards disappear from the renamed pages.
UPDATE "Provider"
SET "locations" = array_replace("locations", '/bowie-dev', '/bowie-2')
WHERE "locations" @> ARRAY['/bowie-dev']::text[];

UPDATE "Provider"
SET "locations" = array_replace("locations", '/columbia-dev', '/columbia-2')
WHERE "locations" @> ARRAY['/columbia-dev']::text[];
