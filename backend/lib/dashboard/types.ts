export type IncidentStatus =
  | "pending"
  | "verified"
  | "assigned"
  | "responding"
  | "resolved"
  | "archived"
  | "rejected";

export type Severity = "low" | "moderate" | "high" | "critical";

export type Incident = {
  id: string;
  reporterUserId: string;
  incidentCategoryId: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  locationAccuracy: number | null;
  approximateAddress: string | null;
  barangayId: string | null;
  severityLevel: Severity;
  status: IncidentStatus;
  assignedResponderId: string | null;
  responderRemarks: string | null;
  rejectedReason: string | null;
  reportedAt: string;
  resolvedAt: string | null;
  archivedAt: string | null;
  incidentCategoryName?: string;
  barangayName?: string | null;
  reporterName?: string;
  assignedResponderName?: string | null;
  assignedResponderTeam?: string | null;
};

export type ReferenceData = {
  barangays: Array<{ id: string; name: string }>;
  incidentCategories: Array<{ id: string; name: string }>;
  emergencyContacts: unknown[];
  evacuationCenters: unknown[];
  incidentStatuses: IncidentStatus[];
  severityLevels: Severity[];
};

export type Summary = {
  totalReports: number;
  pendingReports: number;
  activeIncidents: number;
  resolvedIncidents: number;
  alertsSent: number;
  availableResponders: number;
};

export type Responder = {
  id: string;
  userId: string;
  name: string;
  email: string;
  barangayId: string | null;
  barangayName: string | null;
  teamName: string | null;
  specialization: string | null;
  vehicle: string | null;
  isAvailable: boolean;
};

export type IncidentPhoto = {
  id: string;
  downloadUrl: string;
  originalFilename: string | null;
  mimeType: string;
  bytes: number;
  createdAt: string;
};

export type StatusLog = {
  id: string;
  fromStatus: string | null;
  toStatus: IncidentStatus;
  remarks: string | null;
  changedByName: string | null;
  createdAt: string;
};

export type Assignment = {
  id: string;
  responderId: string;
  responderName: string | null;
  responderTeam: string | null;
  assignedVehicle: string | null;
  etaMinutes: number | null;
  notes: string | null;
  status: string;
  createdAt: string;
};

export type IncidentDetail = {
  incident: Incident;
  photos: IncidentPhoto[];
  statusLogs: StatusLog[];
  assignments: Assignment[];
  reporter: {
    id: string;
    name: string;
    mobileNumber: string | null;
    barangayId: string | null;
    address: string | null;
  } | null;
  category: { id: string; name: string } | null;
  barangay: { id: string; name: string } | null;
  assignedResponder: Responder | null;
};

export type Alert = {
  id: string;
  title: string;
  message: string;
  alertType: string;
  severityLevel: Severity;
  targetType: "all" | "barangay" | "group";
  targetBarangayId: string | null;
  targetRole: string | null;
  sentAt: string;
  recipientCount: number;
};

export type Analytics = {
  incidentsPerBarangay: Array<{ barangay: string | null; count: number }>;
  commonIncidentTypes: Array<{ category: string | null; count: number }>;
  monthlyTrend: Array<{ month: string; count: number }>;
  averageResponseSeconds: number | null;
};

export type HeatmapData = {
  points: Array<{ latitude: number; longitude: number; count: number }>;
};

export type MapIncident = Pick<
  Incident,
  | "id"
  | "title"
  | "status"
  | "severityLevel"
  | "latitude"
  | "longitude"
  | "barangayId"
  | "reportedAt"
>;
