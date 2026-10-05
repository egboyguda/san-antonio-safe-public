CREATE TABLE "offline_sync_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"client_batch_id" text NOT NULL,
	"device_id" text,
	"status" text DEFAULT 'processed' NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "incident_photos" ADD COLUMN "client_photo_id" text;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD COLUMN "client_report_id" text;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD COLUMN "client_created_at" timestamp;--> statement-breakpoint
ALTER TABLE "offline_sync_batches" ADD CONSTRAINT "offline_sync_batches_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "offline_sync_batches_user_client_batch_unique" ON "offline_sync_batches" USING btree ("user_id","client_batch_id");--> statement-breakpoint
CREATE INDEX "offline_sync_batches_user_id_idx" ON "offline_sync_batches" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "incident_photos_report_client_photo_unique" ON "incident_photos" USING btree ("incident_report_id","client_photo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "incident_reports_reporter_client_report_unique" ON "incident_reports" USING btree ("reporter_user_id","client_report_id");