CREATE TABLE "company_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"organization_linkedin_url" text NOT NULL,
	"post_url" text NOT NULL,
	"posted_date" timestamp,
	"language" text,
	"author" text,
	"text" text,
	"reactions" integer,
	"like" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer,
	"linkedin_url" text NOT NULL,
	"post_url" text NOT NULL,
	"posted_date" timestamp,
	"language" text,
	"author" text,
	"text" text,
	"reactions" integer,
	"like" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_posts" ADD CONSTRAINT "company_posts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_posts" ADD CONSTRAINT "lead_posts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;