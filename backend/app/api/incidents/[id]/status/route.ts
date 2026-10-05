import { eq } from "drizzle-orm";
import { db } from "@/db";
import { incidentReports, incidentStatusLogs, responders } from "@/db/schema";
import { canManageIncidents, requireAuth } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { ApiError, jsonOk, newId, parseJson, withApiErrorHandling } from "@/lib/api/http";
import { updateIncidentStatusSchema } from "@/lib/api/schemas";
import { canTransitionIncidentStatus } from "@/lib/domain/incident-status";
import type { IncidentStatus } from "@/lib/domain/constants";
import { createNotificationsForUsers } from "@/lib/services/notifications";
import { refreshResponderAvailability } from "@/lib/services/responder-availability";

export const PATCH = withApiErrorHandling(
  async (request, context: { params: Promise<{ id: string }> }) => {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    const body = await parseJson(request, updateIncidentStatusSchema);

    const [incident] = await db
      .select()
      .from(incidentReports)
      .where(eq(incidentReports.id, id));

    if (!incident) {
      throw new ApiError(404, "Incident not found");
    }

    if (!canManageIncidents(auth.user.role)) {
      if (auth.user.role !== "responder") {
        throw new ApiError(403, "Only responders or staff can update incident status");
      }

      const [responder] = await db
        .select({ id: responders.id })
        .from(responders)
        .where(eq(responders.userId, auth.user.id));

      if (!responder || incident.assignedResponderId !== responder.id) {
        throw new ApiError(403, "Incident is not assigned to this responder");
      }
    }

    const fromStatus = incident.status as IncidentStatus;
    if (!canTransitionIncidentStatus(fromStatus, body.status)) {
      throw new ApiError(409, `Cannot move incident from ${fromStatus} to ${body.status}`);
    }

    const [updated] = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(incidentReports)
        .set({
          status: body.status,
          resolvedAt: body.status === "resolved" ? new Date() : incident.resolvedAt,
          archivedAt: body.status === "archived" ? new Date() : incident.archivedAt,
          responderRemarks: body.remarks ?? incident.responderRemarks,
          rejectedReason:
            body.status === "rejected"
              ? body.remarks ?? incident.rejectedReason
              : incident.rejectedReason,
        })
        .where(eq(incidentReports.id, id))
        .returning();

      await tx.insert(incidentStatusLogs).values({
        id: newId(),
        incidentReportId: id,
        fromStatus,
        toStatus: body.status,
        remarks: body.remarks ?? null,
        changedByUserId: auth.user.id,
      });

      return [row];
    });

    if (["resolved", "archived", "rejected"].includes(body.status)) {
      await refreshResponderAvailability([incident.assignedResponderId]);
    }

    if (incident.reporterUserId !== auth.user.id) {
      await createNotificationsForUsers([incident.reporterUserId], {
        type: "incident_status",
        title: "Incident status updated",
        body: `${incident.title} is now ${body.status}`,
        data: { incidentId: id, status: body.status },
      });
    }

    await writeAuditLog({
      request,
      actorUserId: auth.user.id,
      action: "incident.status_update",
      entityType: "incident_report",
      entityId: id,
      metadata: { fromStatus, toStatus: body.status },
    });

    return jsonOk({ incident: updated });
  },
);
