ALTER TABLE "companies" ADD COLUMN "employees_scraped" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "employees_scraped_at" timestamp;