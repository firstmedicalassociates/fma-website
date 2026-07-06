ALTER TABLE "Provider"
ADD COLUMN "athenaProviderId" TEXT,
ADD COLUMN "athenaDepartmentId" TEXT,
ADD COLUMN "athenaSchedulingName" TEXT;

CREATE INDEX "Provider_athenaProviderId_idx" ON "Provider"("athenaProviderId");
