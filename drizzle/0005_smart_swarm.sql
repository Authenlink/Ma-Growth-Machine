ALTER TABLE "leads" ADD COLUMN "headline" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "about" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "public_identifier" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "object_urn" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "profile_picture" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "connections_count" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "follower_count" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "registered_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "open_to_work" boolean;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "verified" boolean;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "current_position" jsonb;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "experience" jsonb;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "education" jsonb;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "top_skills" jsonb;