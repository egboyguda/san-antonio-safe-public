export const APP_ROLES = [
  "resident",
  "responder",
  "barangay_officer",
  "command_center_staff",
  "admin",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const STAFF_ROLES: AppRole[] = [
  "barangay_officer",
  "command_center_staff",
  "admin",
];

export const COMMAND_ROLES: AppRole[] = ["command_center_staff", "admin"];

export const INCIDENT_STATUSES = [
  "pending",
  "verified",
  "assigned",
  "responding",
  "resolved",
  "archived",
  "rejected",
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const SEVERITY_LEVELS = ["low", "moderate", "high", "critical"] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export const ALERT_TARGET_TYPES = ["all", "barangay", "area", "group", "user"] as const;
export type AlertTargetType = (typeof ALERT_TARGET_TYPES)[number];

export const NOTIFICATION_TYPES = [
  "alert",
  "incident_status",
  "responder_assignment",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const SAN_ANTONIO_BARANGAYS = [
  "Burabod",
  "Dalupirit",
  "Manraya",
  "Pilar",
  "Rizal",
  "San Nicolas",
  "Vinisitahan",
  "Ward I",
  "Ward II",
  "Ward III",
] as const;

export function isAppRole(role: string | null | undefined): role is AppRole {
  return APP_ROLES.includes(role as AppRole);
}

export function normalizeRole(role: string | null | undefined): AppRole {
  return isAppRole(role) ? role : "resident";
}
