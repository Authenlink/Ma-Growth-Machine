ALTER TABLE "scrapers" ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE "scrapers" ADD COLUMN IF NOT EXISTS "info_type" text;
