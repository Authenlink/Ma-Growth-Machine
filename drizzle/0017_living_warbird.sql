CREATE TABLE "seo_local_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"lead_id" integer,
	"user_id" integer NOT NULL,
	"analysis" jsonb,
	"cost_usd" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seo_local_analyses" ADD CONSTRAINT "seo_local_analyses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_local_analyses" ADD CONSTRAINT "seo_local_analyses_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_local_analyses" ADD CONSTRAINT "seo_local_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_seo_local_analyses_company_id" ON "seo_local_analyses" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_seo_local_analyses_user_id" ON "seo_local_analyses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_seo_local_analyses_created_at" ON "seo_local_analyses" USING btree ("created_at");