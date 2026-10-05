import { z } from "zod";
import {
  ALERT_TARGET_TYPES,
  APP_ROLES,
  INCIDENT_STATUSES,
  SEVERITY_LEVELS,
} from "@/lib/domain/constants";

const nullableString = z.string().trim().min(1).nullable().optional();
const optionalString = z.string().trim().min(1).optional();
const idString = z.string().trim().min(1);

export const appRoleSchema = z.enum(APP_ROLES);
export const incidentStatusSchema = z.enum(INCIDENT_STATUSES);
export const severityLevelSchema = z.enum(SEVERITY_LEVELS);
export const alertTargetTypeSchema = z.enum(ALERT_TARGET_TYPES);

export const localPhotoUploadFieldsSchema = z.object({
  clientPhotoId: idString,
});

export const profilePatchSchema = z.object({
  name: optionalString,
  mobileNumber: nullableString,
  barangayId: nullableString,
  address: nullableString,
  emergencyContactName: nullableString,
  emergencyContactNumber: nullableString,
});

export const deviceTokenSchema = z.object({
  token: idString,
  platform: z.enum(["android", "ios", "web"]).default("android"),
  deviceId: nullableString,
  appVersion: nullableString,
});

export const createIncidentSchema = z.object({
  clientReportId: optionalString,
  clientCreatedAt: z.coerce.date().optional(),
  incidentCategoryId: idString,
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(3).max(5000),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationAccuracy: z.number().positive().optional(),
  approximateAddress: nullableString,
  barangayId: nullableString,
  severityLevel: severityLevelSchema.default("moderate"),
});

export const patchIncidentSchema = z.object({
  title: optionalString,
  description: optionalString,
  severityLevel: severityLevelSchema.optional(),
  barangayId: nullableString,
  responderRemarks: nullableString,
  rejectedReason: nullableString,
});

export const updateIncidentStatusSchema = z.object({
  status: incidentStatusSchema,
  remarks: z.string().trim().max(2000).optional(),
});

export const assignResponderSchema = z.object({
  responderId: idString,
  assignedVehicle: nullableString,
  etaMinutes: z.number().int().min(0).max(1440).optional(),
  notes: nullableString,
});

export const incidentListQuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  status: incidentStatusSchema.optional(),
  severityLevel: severityLevelSchema.optional(),
  categoryId: idString.optional(),
  barangayId: idString.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).default(0),
});

export const responderListQuerySchema = z.object({
  available: z.enum(["true", "false"]).optional(),
  barangayId: idString.optional(),
});

export const createAlertSchema = z.object({
  title: z.string().trim().min(3).max(160),
  message: z.string().trim().min(3).max(5000),
  alertType: z.string().trim().min(2).max(80),
  severityLevel: severityLevelSchema.default("moderate"),
  targetType: alertTargetTypeSchema.default("all"),
  targetBarangayId: nullableString,
  targetRole: appRoleSchema.optional(),
  targetUserId: nullableString,
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusMeters: z.number().int().positive().max(100000).optional(),
});

export const barangayUpsertSchema = z.object({
  name: z.string().trim().min(2).max(120),
  psgcCode: nullableString,
  contactPerson: nullableString,
  contactNumber: nullableString,
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export const emergencyContactSchema = z.object({
  name: z.string().trim().min(2).max(160),
  contactType: z.string().trim().min(2).max(80),
  phoneNumber: z.string().trim().min(3).max(80),
  barangayId: nullableString,
  address: nullableString,
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const evacuationCenterSchema = z.object({
  name: z.string().trim().min(2).max(160),
  address: z.string().trim().min(2).max(300),
  barangayId: nullableString,
  capacity: z.number().int().positive().nullable().optional(),
  contactPerson: nullableString,
  contactNumber: nullableString,
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const alertTemplateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  alertType: z.string().trim().min(2).max(80),
  severityLevel: severityLevelSchema.default("moderate"),
  title: z.string().trim().min(3).max(160),
  message: z.string().trim().min(3).max(5000),
  isActive: z.boolean().default(true),
});

export const systemSettingsPatchSchema = z.record(z.string(), z.unknown());

export const adminUserPatchSchema = z.object({
  role: appRoleSchema.optional(),
  banned: z.boolean().optional(),
  banReason: nullableString,
  banExpires: z.coerce.date().nullable().optional(),
  name: optionalString,
  mobileNumber: nullableString,
  barangayId: nullableString,
  address: nullableString,
  emergencyContactName: nullableString,
  emergencyContactNumber: nullableString,
});

export const syncCreateIncidentOperationSchema = z.object({
  clientOperationId: idString,
  type: z.literal("create_incident"),
  payload: createIncidentSchema,
});

export const syncUpdateProfileOperationSchema = z.object({
  clientOperationId: idString,
  type: z.literal("update_profile"),
  payload: profilePatchSchema,
});

export const syncRegisterDeviceOperationSchema = z.object({
  clientOperationId: idString,
  type: z.literal("register_device"),
  payload: deviceTokenSchema,
});

export const syncOperationSchema = z.discriminatedUnion("type", [
  syncCreateIncidentOperationSchema,
  syncUpdateProfileOperationSchema,
  syncRegisterDeviceOperationSchema,
]);

export const syncPushSchema = z.object({
  clientBatchId: idString,
  deviceId: nullableString,
  operations: z.array(syncOperationSchema).min(1).max(50),
});

export const syncPullQuerySchema = z.object({
  since: z.coerce.date().optional(),
});