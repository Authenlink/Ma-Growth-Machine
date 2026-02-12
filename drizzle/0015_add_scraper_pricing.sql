ALTER TABLE "scrapers" ADD COLUMN IF NOT EXISTS "tool_url" text;
ALTER TABLE "scrapers" ADD COLUMN IF NOT EXISTS "payment_type" text;
ALTER TABLE "scrapers" ADD COLUMN IF NOT EXISTS "cost_per_thousand" real;
ALTER TABLE "scrapers" ADD COLUMN IF NOT EXISTS "cost_per_lead" real;
ALTER TABLE "scrapers" ADD COLUMN IF NOT EXISTS "actor_start_cost" real;
ALTER TABLE "scrapers" ADD COLUMN IF NOT EXISTS "free_quota_monthly" integer;
ALTER TABLE "scrapers" ADD COLUMN IF NOT EXISTS "pricing_tiers" jsonb;
