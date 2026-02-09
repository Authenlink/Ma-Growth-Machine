CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"linkedin_url" text,
	"founded_year" integer,
	"industry" text,
	"size" text,
	"description" text,
	"specialities" jsonb,
	"city" text,
	"state" text,
	"country" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"collection_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"company_id" integer,
	"person_id" text,
	"full_name" text,
	"first_name" text,
	"last_name" text,
	"position" text,
	"linkedin_url" text,
	"seniority" text,
	"functional" text,
	"email" text,
	"personal_email" text,
	"phone_numbers" jsonb,
	"city" text,
	"state" text,
	"country" text,
	"company_linkedin_post" text,
	"person_linkedin_post" text,
	"ice_breaker" text,
	"status" text,
	"validated" boolean DEFAULT false NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;