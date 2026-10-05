DROP INDEX IF EXISTS "incident_photos_cloudinary_public_id_unique";--> statement-breakpoint
ALTER TABLE "incident_photos" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "incident_photos" ADD COLUMN "original_filename" text;--> statement-breakpoint
ALTER TABLE "incident_photos" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "incident_photos" ADD COLUMN "sha256" text;--> statement-breakpoint
ALTER TABLE "incident_photos" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "incident_photos"
SET
  "client_photo_id" = COALESCE("client_photo_id", "id"),
  "storage_key" = COALESCE("storage_key", 'legacy/' || "id"),
  "original_filename" = COALESCE("original_filename", 'legacy-photo'),
  "mime_type" = CASE lower(COALESCE("format", ''))
    WHEN 'png' THEN 'image/png'
    WHEN 'webp' THEN 'image/webp'
    ELSE 'image/jpeg'
  END,
  "bytes" = COALESCE("bytes", 0),
  "sha256" = COALESCE("sha256", 'legacy-unavailable-' || "id");--> statement-breakpoint
ALTER TABLE "incident_photos" ALTER COLUMN "client_photo_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "incident_photos" ALTER COLUMN "storage_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "incident_photos" ALTER COLUMN "mime_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "incident_photos" ALTER COLUMN "bytes" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "incident_photos" ALTER COLUMN "sha256" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "incident_photos" DROP COLUMN "cloudinary_public_id";--> statement-breakpoint
ALTER TABLE "incident_photos" DROP COLUMN "secure_url";--> statement-breakpoint
ALTER TABLE "incident_photos" DROP COLUMN "format";--> statement-breakpoint
CREATE UNIQUE INDEX "incident_photos_storage_key_unique" ON "incident_photos" USING btree ("storage_key");