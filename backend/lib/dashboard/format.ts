import type { IncidentStatus, Severity } from "./types";

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  pending: "Pending",
  verified: "Verified",
  assigned: "Assigned",
  responding: "Responding",
  resolved: "Resolved",
  archived: "Archived",
  rejected: "Rejected",
};

export const NEXT_STATUSES: Record<IncidentStatus, IncidentStatus[]> = {
  pending: ["verified", "rejected", "archived"],
  verified: ["assigned", "responding", "resolved", "rejected", "archived"],
  assigned: ["responding", "resolved", "archived"],
  responding: ["resolved", "archived"],
  resolved: ["archived"],
  rejected: ["archived"],
  archived: [],
};

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "?";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDuration(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return "No resolved data";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function statusTone(status: IncidentStatus) {
  return `status-${status}`;
}

export function severityTone(severity: Severity) {
  return `severity-${severity}`;
}
