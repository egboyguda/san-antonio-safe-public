import { eq } from "drizzle-orm";
import { db } from "@/db";
import { incidentReports, responders, userProfiles } from "@/db/schema";
import { canManageIncidents, requireAuth, type AuthContext } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/http";

export type IncidentRecord = typeof incidentReports.$inferSelect;

export async function getIncidentOrThrow(id: string): Promise<IncidentRecord> {
  const [incident] = await db
    .select()
    .from(incidentReports)
    .where(eq(incidentReports.id, id));

  if (!incident) {
    throw new ApiError(404, "Incident not found");
  }

  return incident;
}

export async function assertCanReadIncident(
  request: Request,
  incident: IncidentRecord,
): Promise<AuthContext> {
  const auth = await requireAuth(request);

  if (canManageIncidents(auth.user.role)) {
    if (auth.user.role === "barangay_officer") {
      const [profile] = await db
        .select({ barangayId: userProfiles.barangayId })
        .from(userProfiles)
        .where(eq(userProfiles.userId, auth.user.id));

      if (profile?.barangayId && incident.barangayId !== profile.barangayId) {
        throw new ApiError(403, "Incident is outside your barangay");
      }
    }
    return auth;
  }

  if (auth.user.role === "resident" && incident.reporterUserId === auth.user.id) {
    return auth;
  }

  if (auth.user.role === "responder") {
    const [responder] = await db
      .select({ id: responders.id })
      .from(responders)
      .where(eq(responders.userId, auth.user.id));

    if (responder?.id && incident.assignedResponderId === responder.id) {
      return auth;
    }
  }

  throw new ApiError(403, "You cannot access this incident");
}

export async function assertCanAttachIncidentPhoto(
  request: Request,
  incident: IncidentRecord,
): Promise<AuthContext> {
  return assertCanReadIncident(request, incident);
}