CREATE TABLE "trustpilot_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"trustpilot_id" text NOT NULL,
	"rating" integer NOT NULL,
	"published_date" timestamp,
	"title" text,
	"body" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trustpilot_reviews" ADD CONSTRAINT "trustpilot_reviews_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trustpilot_reviews_company_trustpilot_idx" ON "trustpilot_reviews" USING btree ("company_id","trustpilot_id");