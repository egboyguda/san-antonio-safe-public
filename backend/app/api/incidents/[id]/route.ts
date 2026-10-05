import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  barangays,
  incidentCategories,
  incidentPhotos,
  incidentReports,
  incidentStatusLogs,
  responderAssignments,
  responders,
  user,
  userProfiles,
} from "@/db/schema";
import { writeAuditLog } from "@/lib/api/audit";
import { ApiError, jsonOk, parseJson, withApiErrorHandling } from "@/lib/api/http";
import { patchIncidentSchema } from "@/lib/api/schemas";
import { assertCanReadIncident, getIncidentOrThrow } from "@/lib/services/incident-access";

type IncidentUpdate = Partial<typeof incidentReports.$inferInsert>;

function photoWithDownloadUrl(photo: typeof incidentPhotos.$inferSelect) {
  return {
    ...photo,
    downloadUrl: `/api/incidents/${photo.incidentReportId}/photos/${photo.id}`,
  };
}

export const GET = withApiErrorHandling(
  async (request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const incident = await getIncidentOrThrow(id);
    await assertCanReadIncident(request, incident);

    const [photos, statusLogs, assignments] = await Promise.all([
      db.select().from(incidentPhotos).where(eq(incidentPhotos.incidentReportId, id)),
      db
        .select()
        .from(incidentStatusLogs)
        .where(eq(incidentStatusLogs.incidentReportId, id))
        .orderBy(desc(incidentStatusLogs.createdAt)),
      db
        .select()
        .from(responderAssignments)
        .where(eq(responderAssignments.incidentReportId, id))
        .orderBy(desc(responderAssignments.createdAt)),
    ]);

    const assignmentResponderIds = [
      ...new Set(assignments.map((assignment) => assignment.responderId)),
    ];
    const changedByIds = [
      ...new Set(
        statusLogs.flatMap((log) => (log.changedByUserId ? [log.changedByUserId] : [])),
      ),
    ];
    const [
      reporterRows,
      categoryRows,
      barangayRows,
      assignedResponderRows,
      assignmentResponderRows,
      changedByRows,
    ] = await Promise.all([
      db
        .select({
          id: user.id,
          name: user.name,
          mobileNumber: userProfiles.mobileNumber,
          barangayId: userProfiles.barangayId,
          address: userProfiles.address,
        })
        .from(user)
        .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
        .where(eq(user.id, incident.reporterUserId)),
      db
        .select({ id: incidentCategories.id, name: incidentCategories.name })
        .from(incidentCategories)
        .where(eq(incidentCategories.id, incident.incidentCategoryId)),
      incident.barangayId
        ? db
            .select({ id: barangays.id, name: barangays.name })
            .from(barangays)
            .where(eq(barangays.id, incident.barangayId))
        : [],
      incident.assignedResponderId
        ? db
            .select({
              id: responders.id,
              name: user.name,
              teamName: responders.teamName,
              specialization: responders.specialization,
              vehicle: responders.vehicle,
              isAvailable: responders.isAvailable,
            })
            .from(responders)
            .innerJoin(user, eq(responders.userId, user.id))
            .where(eq(responders.id, incident.assignedResponderId))
        : [],
      assignmentResponderIds.length
        ? db
            .select({
              id: responders.id,
              name: user.name,
              teamName: responders.teamName,
            })
            .from(responders)
            .innerJoin(user, eq(responders.userId, user.id))
            .where(inArray(responders.id, assignmentResponderIds))
        : [],
      changedByIds.length
        ? db
            .select({ id: user.id, name: user.name })
            .from(user)
            .where(inArray(user.id, changedByIds))
        : [],
    ]);

    const respondersById = new Map(
      assignmentResponderRows.map((row) => [row.id, row]),
    );
    const usersById = new Map(changedByRows.map((row) => [row.id, row.name]));

    return jsonOk({
      incident,
      photos: photos.map(photoWithDownloadUrl),
      statusLogs: statusLogs.map((log) => ({
        ...log,
        changedByName: log.changedByUserId
          ? usersById.get(log.changedByUserId) ?? null
          : null,
      })),
      assignments: assignments.map((assignment) => ({
        ...assignment,
        responderName: respondersById.get(assignment.responderId)?.name ?? null,
        responderTeam: respondersById.get(assignment.responderId)?.teamName ?? null,
      })),
      reporter: reporterRows[0] ?? null,
      category: categoryRows[0] ?? null,
      barangay: barangayRows[0] ?? null,
      assignedResponder: assignedResponderRows[0] ?? null,
    });
  },
);

export const PATCH = withApiErrorHandling(
  async (request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const incident = await getIncidentOrThrow(id);
    const auth = await assertCanReadIncident(request, incident);
    const body = await parseJson(request, patchIncidentSchema);

    if (
      auth.user.role === "resident" &&
      (incident.reporterUserId !== auth.user.id || incident.status !== "pending")
    ) {
      throw new ApiError(403, "Residents can only update their own pending reports");
    }

    const updates: IncidentUpdate = {};
    if (body.title) updates.title = body.title;
    if (body.description) updates.description = body.description;
    if (body.severityLevel) updates.severityLevel = body.severityLevel;
    if ("barangayId" in body) updates.barangayId = body.barangayId ?? null;
    if ("responderRemarks" in body) updates.responderRemarks = body.responderRemarks ?? null;
    if ("rejectedReason" in body) updates.rejectedReason = body.rejectedReason ?? null;

    const [updated] = await db
      .update(incidentReports)
      .set(updates)
      .where(and(eq(incidentReports.id, id)))
      .returning();

    await writeAuditLog({
      request,
      actorUserId: auth.user.id,
      action: "incident.update",
      entityType: "incident_report",
      entityId: id,
    });

    return jsonOk({ incident: updated });
  },
);