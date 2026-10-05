import { relations, sql } from "drizzle-orm";
import {
  boolean,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  pgTable,
} from "drizzle-orm/pg-core";

export type GeoPoint = {
  x: number;
  y: number;
};

const geometryPoint = customType<{ data: GeoPoint; driverData: string }>({
  dataType() {
    return "geometry(Point,4326)";
  },
  toDriver(value) {
    return sql`ST_SetSRID(ST_MakePoint(${value.x}, ${value.y}), 4326)`;
  },
});

const createdAt = timestamp("created_at").defaultNow().notNull();
const updatedAt = timestamp("updated_at")
  .defaultNow()
  .$onUpdate(() => /* @__PURE__ */ new Date())
  .notNull();

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: text("role").default("resident").notNull(),
  banned: boolean("banned").default(false).notNull(),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt,
  updatedAt,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt,
    updatedAt,
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    impersonatedBy: text("impersonated_by"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt,
    updatedAt,
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const barangays = pgTable(
  "barangays",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    psgcCode: text("psgc_code"),
    contactPerson: text("contact_person"),
    contactNumber: text("contact_number"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    centerLocation: geometryPoint("center_location"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("barangays_name_unique").on(table.name),
    index("barangays_center_location_idx").using("gist", table.centerLocation),
  ],
);

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mobileNumber: text("mobile_number"),
    barangayId: text("barangay_id").references(() => barangays.id, {
      onDelete: "set null",
    }),
    address: text("address"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactNumber: text("emergency_contact_number"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("user_profiles_user_id_unique").on(table.userId),
    index("user_profiles_barangay_id_idx").on(table.barangayId),
  ],
);

export const incidentCategories = pgTable(
  "incident_categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    defaultSeverityLevel: text("default_severity_level").default("moderate").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex("incident_categories_name_unique").on(table.name)],
);

export const incidentReports = pgTable(
  "incident_reports",
  {
    id: text("id").primaryKey(),
    reporterUserId: text("reporter_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    incidentCategoryId: text("incident_category_id")
      .notNull()
      .references(() => incidentCategories.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    clientReportId: text("client_report_id"),
    clientCreatedAt: timestamp("client_created_at"),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    location: geometryPoint("location").notNull(),
    locationAccuracy: doublePrecision("location_accuracy"),
    approximateAddress: text("approximate_address"),
    barangayId: text("barangay_id").references(() => barangays.id, {
      onDelete: "set null",
    }),
    severityLevel: text("severity_level").default("moderate").notNull(),
    status: text("status").default("pending").notNull(),
    assignedResponderId: text("assigned_responder_id"),
    responderRemarks: text("responder_remarks"),
    rejectedReason: text("rejected_reason"),
    reportedAt: timestamp("reported_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
    archivedAt: timestamp("archived_at"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("incident_reports_reporter_user_id_idx").on(table.reporterUserId),
    index("incident_reports_category_id_idx").on(table.incidentCategoryId),
    index("incident_reports_barangay_id_idx").on(table.barangayId),
    index("incident_reports_status_idx").on(table.status),
    index("incident_reports_severity_idx").on(table.severityLevel),
    index("incident_reports_location_idx").using("gist", table.location),
    uniqueIndex("incident_reports_reporter_client_report_unique").on(
      table.reporterUserId,
      table.clientReportId,
    ),
  ],
);

export const responders = pgTable(
  "responders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    barangayId: text("barangay_id").references(() => barangays.id, {
      onDelete: "set null",
    }),
    teamName: text("team_name"),
    specialization: text("specialization"),
    vehicle: text("vehicle"),
    isAvailable: boolean("is_available").default(true).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("responders_user_id_unique").on(table.userId),
    index("responders_barangay_id_idx").on(table.barangayId),
    index("responders_available_idx").on(table.isAvailable),
  ],
);

export const incidentPhotos = pgTable(
  "incident_photos",
  {
    id: text("id").primaryKey(),
    incidentReportId: text("incident_report_id")
      .notNull()
      .references(() => incidentReports.id, { onDelete: "cascade" }),
    clientPhotoId: text("client_photo_id").notNull(),
    storageKey: text("storage_key").notNull(),
    originalFilename: text("original_filename"),
    mimeType: text("mime_type").notNull(),
    bytes: integer("bytes").notNull(),
    sha256: text("sha256").notNull(),
    width: integer("width"),
    height: integer("height"),
    uploadedByUserId: text("uploaded_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("incident_photos_incident_report_id_idx").on(table.incidentReportId),
    uniqueIndex("incident_photos_storage_key_unique").on(table.storageKey),
    uniqueIndex("incident_photos_report_client_photo_unique").on(
      table.incidentReportId,
      table.clientPhotoId,
    ),
  ],
);
export const incidentStatusLogs = pgTable(
  "incident_status_logs",
  {
    id: text("id").primaryKey(),
    incidentReportId: text("incident_report_id")
      .notNull()
      .references(() => incidentReports.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    remarks: text("remarks"),
    changedByUserId: text("changed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt,
  },
  (table) => [
    index("incident_status_logs_incident_report_id_idx").on(table.incidentReportId),
    index("incident_status_logs_changed_by_user_id_idx").on(table.changedByUserId),
  ],
);

export const responderAssignments = pgTable(
  "responder_assignments",
  {
    id: text("id").primaryKey(),
    incidentReportId: text("incident_report_id")
      .notNull()
      .references(() => incidentReports.id, { onDelete: "cascade" }),
    responderId: text("responder_id")
      .notNull()
      .references(() => responders.id, { onDelete: "cascade" }),
    assignedByUserId: text("assigned_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    assignedVehicle: text("assigned_vehicle"),
    etaMinutes: integer("eta_minutes"),
    notes: text("notes"),
    status: text("status").default("assigned").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("responder_assignments_incident_report_id_idx").on(
      table.incidentReportId,
    ),
    index("responder_assignments_responder_id_idx").on(table.responderId),
  ],
);

export const emergencyAlerts = pgTable(
  "emergency_alerts",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    alertType: text("alert_type").notNull(),
    severityLevel: text("severity_level").default("moderate").notNull(),
    targetType: text("target_type").default("all").notNull(),
    targetBarangayId: text("target_barangay_id").references(() => barangays.id, {
      onDelete: "set null",
    }),
    targetRole: text("target_role"),
    targetUserId: text("target_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    centerLocation: geometryPoint("center_location"),
    radiusMeters: integer("radius_meters"),
    sentByUserId: text("sent_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("emergency_alerts_target_barangay_id_idx").on(table.targetBarangayId),
    index("emergency_alerts_sent_by_user_id_idx").on(table.sentByUserId),
    index("emergency_alerts_center_location_idx").using("gist", table.centerLocation),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().default({}).notNull(),
    readAt: timestamp("read_at"),
    createdAt,
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_read_at_idx").on(table.readAt),
  ],
);

export const alertRecipients = pgTable(
  "alert_recipients",
  {
    id: text("id").primaryKey(),
    alertId: text("alert_id")
      .notNull()
      .references(() => emergencyAlerts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    notificationId: text("notification_id").references(() => notifications.id, {
      onDelete: "set null",
    }),
    readAt: timestamp("read_at"),
    createdAt,
  },
  (table) => [
    uniqueIndex("alert_recipients_alert_user_unique").on(table.alertId, table.userId),
    index("alert_recipients_user_id_idx").on(table.userId),
  ],
);

export const deviceTokens = pgTable(
  "device_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    platform: text("platform").default("android").notNull(),
    deviceId: text("device_id"),
    appVersion: text("app_version"),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("device_tokens_token_unique").on(table.token),
    index("device_tokens_user_id_idx").on(table.userId),
  ],
);

export const offlineSyncBatches = pgTable(
  "offline_sync_batches",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    clientBatchId: text("client_batch_id").notNull(),
    deviceId: text("device_id"),
    status: text("status").default("processed").notNull(),
    result: jsonb("result").$type<Record<string, unknown>>().default({}).notNull(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    createdAt,
  },
  (table) => [
    uniqueIndex("offline_sync_batches_user_client_batch_unique").on(
      table.userId,
      table.clientBatchId,
    ),
    index("offline_sync_batches_user_id_idx").on(table.userId),
  ],
);
export const emergencyContacts = pgTable(
  "emergency_contacts",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    contactType: text("contact_type").notNull(),
    phoneNumber: text("phone_number").notNull(),
    barangayId: text("barangay_id").references(() => barangays.id, {
      onDelete: "set null",
    }),
    address: text("address"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("emergency_contacts_barangay_id_idx").on(table.barangayId),
    index("emergency_contacts_active_idx").on(table.isActive),
  ],
);

export const evacuationCenters = pgTable(
  "evacuation_centers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    address: text("address").notNull(),
    barangayId: text("barangay_id").references(() => barangays.id, {
      onDelete: "set null",
    }),
    capacity: integer("capacity"),
    contactPerson: text("contact_person"),
    contactNumber: text("contact_number"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    location: geometryPoint("location"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("evacuation_centers_barangay_id_idx").on(table.barangayId),
    index("evacuation_centers_location_idx").using("gist", table.location),
    index("evacuation_centers_active_idx").on(table.isActive),
  ],
);

export const alertTemplates = pgTable(
  "alert_templates",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    alertType: text("alert_type").notNull(),
    severityLevel: text("severity_level").default("moderate").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("alert_templates_name_unique").on(table.name),
    index("alert_templates_active_idx").on(table.isActive),
  ],
);

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().default({}).notNull(),
  updatedByUserId: text("updated_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  updatedAt,
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt,
  },
  (table) => [
    index("audit_logs_actor_user_id_idx").on(table.actorUserId),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  profile: one(userProfiles),
  reportedIncidents: many(incidentReports),
  notifications: many(notifications),
  deviceTokens: many(deviceTokens),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const userProfileRelations = relations(userProfiles, ({ one }) => ({
  user: one(user, {
    fields: [userProfiles.userId],
    references: [user.id],
  }),
  barangay: one(barangays, {
    fields: [userProfiles.barangayId],
    references: [barangays.id],
  }),
}));

export const incidentReportRelations = relations(incidentReports, ({ many, one }) => ({
  reporter: one(user, {
    fields: [incidentReports.reporterUserId],
    references: [user.id],
  }),
  category: one(incidentCategories, {
    fields: [incidentReports.incidentCategoryId],
    references: [incidentCategories.id],
  }),
  barangay: one(barangays, {
    fields: [incidentReports.barangayId],
    references: [barangays.id],
  }),
  photos: many(incidentPhotos),
  statusLogs: many(incidentStatusLogs),
  assignments: many(responderAssignments),
}));

export const responderRelations = relations(responders, ({ one, many }) => ({
  user: one(user, {
    fields: [responders.userId],
    references: [user.id],
  }),
  barangay: one(barangays, {
    fields: [responders.barangayId],
    references: [barangays.id],
  }),
  assignments: many(responderAssignments),
}));
