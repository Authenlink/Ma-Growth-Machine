CREATE TABLE "entity_scraper_usages" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"scraper_id" integer,
	"run_id" text,
	"source" text NOT NULL,
	"has_result" boolean NOT NULL,
	"item_count" integer NOT NULL,
	"config_used" jsonb,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "source_scraper_id" integer;--> statement-breakpoint
ALTER TABLE "entity_scraper_usages" ADD CONSTRAINT "entity_scraper_usages_scraper_id_scrapers_id_fk" FOREIGN KEY ("scraper_id") REFERENCES "public"."scrapers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_scraper_usages" ADD CONSTRAINT "entity_scraper_usages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_entity_scraper_usages_entity" ON "entity_scraper_usages" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_entity_scraper_usages_scraper_id" ON "entity_scraper_usages" USING btree ("scraper_id");--> statement-breakpoint
CREATE INDEX "idx_entity_scraper_usages_user_id" ON "entity_scraper_usages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_entity_scraper_usages_created_at" ON "entity_scraper_usages" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_source_scraper_id_scrapers_id_fk" FOREIGN KEY ("source_scraper_id") REFERENCES "public"."scrapers"("id") ON DELETE set null ON UPDATE no action;