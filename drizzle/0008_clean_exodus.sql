ALTER TABLE "companies" ADD COLUMN "seo_score" real;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "seo_score_mobile" real;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "seo_score_desktop" real;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "seo_data" jsonb;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "seo_analyzed_at" timestamp;