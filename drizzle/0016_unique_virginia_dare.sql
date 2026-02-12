CREATE TABLE "scraper_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"scraper_id" integer,
	"user_id" integer NOT NULL,
	"source" text,
	"collection_id" integer,
	"lead_id" integer,
	"company_id" integer,
	"cost_usd" real,
	"usage_details" jsonb,
	"item_count" integer,
	"status" text NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scraper_runs" ADD CONSTRAINT "scraper_runs_scraper_id_scrapers_id_fk" FOREIGN KEY ("scraper_id") REFERENCES "public"."scrapers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scraper_runs" ADD CONSTRAINT "scraper_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scraper_runs" ADD CONSTRAINT "scraper_runs_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scraper_runs" ADD CONSTRAINT "scraper_runs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scraper_runs" ADD CONSTRAINT "scraper_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_scraper_runs_user_id" ON "scraper_runs" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_scraper_runs_scraper_id" ON "scraper_runs" USING btree ("scraper_id");
--> statement-breakpoint
CREATE INDEX "idx_scraper_runs_created_at" ON "scraper_runs" USING btree ("created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_scraper_runs_run_id" ON "scraper_runs" USING btree ("run_id");
