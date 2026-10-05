import type { IncidentStatus } from "./constants";

const transitions: Record<IncidentStatus, IncidentStatus[]> = {
  pending: ["verified", "rejected", "archived"],
  verified: ["assigned", "responding", "resolved", "rejected", "archived"],
  assigned: ["responding", "resolved", "archived"],
  responding: ["resolved", "archived"],
  resolved: ["archived"],
  rejected: ["archived"],
  archived: [],
};

export function canTransitionIncidentStatus(
  from: IncidentStatus,
  to: IncidentStatus,
): boolean {
  return from === to || transitions[from].includes(to);
}

export function allowedNextIncidentStatuses(from: IncidentStatus): IncidentStatus[] {
  return transitions[from];
}
