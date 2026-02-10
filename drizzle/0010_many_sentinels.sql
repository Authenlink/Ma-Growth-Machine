CREATE TABLE "lead_collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"collection_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "lead_collections" ("lead_id", "collection_id") SELECT "id", "collection_id" FROM "leads" WHERE "collection_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "leads" DROP CONSTRAINT "leads_collection_id_collections_id_fk";
--> statement-breakpoint
ALTER TABLE "lead_collections" ADD CONSTRAINT "lead_collections_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_collections" ADD CONSTRAINT "lead_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_collections_lead_collection_idx" ON "lead_collections" USING btree ("lead_id","collection_id");--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN "collection_id";