ALTER TABLE "BlogPost" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Uncategorized';

CREATE INDEX "BlogPost_status_category_publishedAt_idx" ON "BlogPost"("status", "category", "publishedAt");
