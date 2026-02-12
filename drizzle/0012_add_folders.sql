CREATE TABLE "folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "folder_id" integer;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "folders" ("user_id", "name", "description")
SELECT DISTINCT "user_id", 'Default', 'Dossier par défaut pour organiser vos collections'
FROM "collections";
--> statement-breakpoint
UPDATE "collections" c
SET "folder_id" = f.id
FROM "folders" f
WHERE c."user_id" = f."user_id"
  AND f."name" = 'Default'
  AND c."folder_id" IS NULL;
--> statement-breakpoint
INSERT INTO "collections" ("user_id", "folder_id", "name", "description")
SELECT f."user_id", f.id, 'Default', 'Collection par défaut'
FROM "folders" f
WHERE NOT EXISTS (
  SELECT 1 FROM "collections" c
  WHERE c."folder_id" = f.id AND c."name" = 'Default'
);