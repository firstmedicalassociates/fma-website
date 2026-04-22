ALTER TABLE "Location"
ADD COLUMN "streetAddress" TEXT,
ADD COLUMN "addressCity" TEXT,
ADD COLUMN "addressState" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "addressCountry" TEXT,
ADD COLUMN "directPhone" TEXT,
ADD COLUMN "callTextPhone" TEXT,
ADD COLUMN "hideOfficePhone" BOOLEAN NOT NULL DEFAULT false;
