-- Give the two secondary offices descriptive public URLs while preserving their
-- CMS records and provider assignments.
UPDATE "Location"
SET "slug" = '/bowie-health-center-dr'
WHERE "slug" = '/bowie-2';

UPDATE "Location"
SET "slug" = '/columbia-broken-land-parkway'
WHERE "slug" = '/columbia-2';

-- Provider assignments are stored as slug arrays rather than foreign keys, so
-- they must be moved with the corresponding location records.
UPDATE "Provider"
SET "locations" = array_replace("locations", '/bowie-2', '/bowie-health-center-dr')
WHERE "locations" @> ARRAY['/bowie-2']::text[];

UPDATE "Provider"
SET "locations" = array_replace("locations", '/columbia-2', '/columbia-broken-land-parkway')
WHERE "locations" @> ARRAY['/columbia-2']::text[];
