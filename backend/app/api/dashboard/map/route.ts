import { desc, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { incidentReports } from "@/db/schema";
import { canManageIncidents, requireAuth } from "@/lib/api/auth";
import { ApiError, jsonOk, withApiErrorHandling } from "@/lib/api/http";

export const GET = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!canManageIncidents(auth.user.role)) {
    throw new ApiError(403, "Only command staff can view the incident map");
  }

  const incidents = await db
    .select({
      id: incidentReports.id,
      title: incidentReports.title,
      status: incidentReports.status,
      severityLevel: incidentReports.severityLevel,
      latitude: incidentReports.latitude,
      longitude: incidentReports.longitude,
      barangayId: incidentReports.barangayId,
      reportedAt: incidentReports.reportedAt,
    })
    .from(incidentReports)
    .where(notInArray(incidentReports.status, ["archived", "rejected"]))
    .orderBy(desc(incidentReports.reportedAt));

  return jsonOk({ incidents });
});
