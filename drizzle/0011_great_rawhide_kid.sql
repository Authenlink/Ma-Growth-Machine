ALTER TABLE "companies" ADD COLUMN "page_speed_data" jsonb;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "collection_id" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;