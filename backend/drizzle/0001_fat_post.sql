CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE TABLE "alert_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"alert_id" text NOT NULL,
	"user_id" text NOT NULL,
	"notification_id" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"alert_type" text NOT NULL,
	"severity_level" text DEFAULT 'moderate' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "barangays" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"psgc_code" text,
	"contact_person" text,
	"contact_number" text,
	"latitude" double precision,
	"longitude" double precision,
	"center_location" geometry(Point,4326),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"platform" text DEFAULT 'android' NOT NULL,
	"device_id" text,
	"app_version" text,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"alert_type" text NOT NULL,
	"severity_level" text DEFAULT 'moderate' NOT NULL,
	"target_type" text DEFAULT 'all' NOT NULL,
	"target_barangay_id" text,
	"target_role" text,
	"target_user_id" text,
	"latitude" double precision,
	"longitude" double precision,
	"center_location" geometry(Point,4326),
	"radius_meters" integer,
	"sent_by_user_id" text,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_type" text NOT NULL,
	"phone_number" text NOT NULL,
	"barangay_id" text,
	"address" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evacuation_centers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"barangay_id" text,
	"capacity" integer,
	"contact_person" text,
	"contact_number" text,
	"latitude" double precision,
	"longitude" double precision,
	"location" geometry(Point,4326),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_severity_level" text DEFAULT 'moderate' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"incident_report_id" text NOT NULL,
	"cloudinary_public_id" text NOT NULL,
	"secure_url" text NOT NULL,
	"width" integer,
	"height" integer,
	"format" text,
	"bytes" integer,
	"uploaded_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_user_id" text NOT NULL,
	"incident_category_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"location" geometry(Point,4326) NOT NULL,
	"location_accuracy" double precision,
	"approximate_address" text,
	"barangay_id" text,
	"severity_level" text DEFAULT 'moderate' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"assigned_responder_id" text,
	"responder_remarks" text,
	"rejected_reason" text,
	"reported_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_status_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"incident_report_id" text NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"remarks" text,
	"changed_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "responder_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"incident_report_id" text NOT NULL,
	"responder_id" text NOT NULL,
	"assigned_by_user_id" text,
	"assigned_vehicle" text,
	"eta_minutes" integer,
	"notes" text,
	"status" text DEFAULT 'assigned' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "responders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"barangay_id" text,
	"team_name" text,
	"specialization" text,
	"vehicle" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by_user_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"mobile_number" text,
	"barangay_id" text,
	"address" text,
	"emergency_contact_name" text,
	"emergency_contact_number" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'resident' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
ALTER TABLE "alert_recipients" ADD CONSTRAINT "alert_recipients_alert_id_emergency_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."emergency_alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_recipients" ADD CONSTRAINT "alert_recipients_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_recipients" ADD CONSTRAINT "alert_recipients_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_templates" ADD CONSTRAINT "alert_templates_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_alerts" ADD CONSTRAINT "emergency_alerts_target_barangay_id_barangays_id_fk" FOREIGN KEY ("target_barangay_id") REFERENCES "public"."barangays"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_alerts" ADD CONSTRAINT "emergency_alerts_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_alerts" ADD CONSTRAINT "emergency_alerts_sent_by_user_id_user_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_barangay_id_barangays_id_fk" FOREIGN KEY ("barangay_id") REFERENCES "public"."barangays"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evacuation_centers" ADD CONSTRAINT "evacuation_centers_barangay_id_barangays_id_fk" FOREIGN KEY ("barangay_id") REFERENCES "public"."barangays"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_photos" ADD CONSTRAINT "incident_photos_incident_report_id_incident_reports_id_fk" FOREIGN KEY ("incident_report_id") REFERENCES "public"."incident_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_photos" ADD CONSTRAINT "incident_photos_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_incident_category_id_incident_categories_id_fk" FOREIGN KEY ("incident_category_id") REFERENCES "public"."incident_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_barangay_id_barangays_id_fk" FOREIGN KEY ("barangay_id") REFERENCES "public"."barangays"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_status_logs" ADD CONSTRAINT "incident_status_logs_incident_report_id_incident_reports_id_fk" FOREIGN KEY ("incident_report_id") REFERENCES "public"."incident_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_status_logs" ADD CONSTRAINT "incident_status_logs_changed_by_user_id_user_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responder_assignments" ADD CONSTRAINT "responder_assignments_incident_report_id_incident_reports_id_fk" FOREIGN KEY ("incident_report_id") REFERENCES "public"."incident_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responder_assignments" ADD CONSTRAINT "responder_assignments_responder_id_responders_id_fk" FOREIGN KEY ("responder_id") REFERENCES "public"."responders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responder_assignments" ADD CONSTRAINT "responder_assignments_assigned_by_user_id_user_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responders" ADD CONSTRAINT "responders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responders" ADD CONSTRAINT "responders_barangay_id_barangays_id_fk" FOREIGN KEY ("barangay_id") REFERENCES "public"."barangays"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_barangay_id_barangays_id_fk" FOREIGN KEY ("barangay_id") REFERENCES "public"."barangays"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alert_recipients_alert_user_unique" ON "alert_recipients" USING btree ("alert_id","user_id");--> statement-breakpoint
CREATE INDEX "alert_recipients_user_id_idx" ON "alert_recipients" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "alert_templates_name_unique" ON "alert_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "alert_templates_active_idx" ON "alert_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "barangays_name_unique" ON "barangays" USING btree ("name");--> statement-breakpoint
CREATE INDEX "barangays_center_location_idx" ON "barangays" USING gist ("center_location");--> statement-breakpoint
CREATE UNIQUE INDEX "device_tokens_token_unique" ON "device_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "emergency_alerts_target_barangay_id_idx" ON "emergency_alerts" USING btree ("target_barangay_id");--> statement-breakpoint
CREATE INDEX "emergency_alerts_sent_by_user_id_idx" ON "emergency_alerts" USING btree ("sent_by_user_id");--> statement-breakpoint
CREATE INDEX "emergency_alerts_center_location_idx" ON "emergency_alerts" USING gist ("center_location");--> statement-breakpoint
CREATE INDEX "emergency_contacts_barangay_id_idx" ON "emergency_contacts" USING btree ("barangay_id");--> statement-breakpoint
CREATE INDEX "emergency_contacts_active_idx" ON "emergency_contacts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "evacuation_centers_barangay_id_idx" ON "evacuation_centers" USING btree ("barangay_id");--> statement-breakpoint
CREATE INDEX "evacuation_centers_location_idx" ON "evacuation_centers" USING gist ("location");--> statement-breakpoint
CREATE INDEX "evacuation_centers_active_idx" ON "evacuation_centers" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "incident_categories_name_unique" ON "incident_categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "incident_photos_incident_report_id_idx" ON "incident_photos" USING btree ("incident_report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "incident_photos_cloudinary_public_id_unique" ON "incident_photos" USING btree ("cloudinary_public_id");--> statement-breakpoint
CREATE INDEX "incident_reports_reporter_user_id_idx" ON "incident_reports" USING btree ("reporter_user_id");--> statement-breakpoint
CREATE INDEX "incident_reports_category_id_idx" ON "incident_reports" USING btree ("incident_category_id");--> statement-breakpoint
CREATE INDEX "incident_reports_barangay_id_idx" ON "incident_reports" USING btree ("barangay_id");--> statement-breakpoint
CREATE INDEX "incident_reports_status_idx" ON "incident_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "incident_reports_severity_idx" ON "incident_reports" USING btree ("severity_level");--> statement-breakpoint
CREATE INDEX "incident_reports_location_idx" ON "incident_reports" USING gist ("location");--> statement-breakpoint
CREATE INDEX "incident_status_logs_incident_report_id_idx" ON "incident_status_logs" USING btree ("incident_report_id");--> statement-breakpoint
CREATE INDEX "incident_status_logs_changed_by_user_id_idx" ON "incident_status_logs" USING btree ("changed_by_user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_read_at_idx" ON "notifications" USING btree ("read_at");--> statement-breakpoint
CREATE INDEX "responder_assignments_incident_report_id_idx" ON "responder_assignments" USING btree ("incident_report_id");--> statement-breakpoint
CREATE INDEX "responder_assignments_responder_id_idx" ON "responder_assignments" USING btree ("responder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "responders_user_id_unique" ON "responders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "responders_barangay_id_idx" ON "responders" USING btree ("barangay_id");--> statement-breakpoint
CREATE INDEX "responders_available_idx" ON "responders" USING btree ("is_available");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_user_id_unique" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_profiles_barangay_id_idx" ON "user_profiles" USING btree ("barangay_id");
