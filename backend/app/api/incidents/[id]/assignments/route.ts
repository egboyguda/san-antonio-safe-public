import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  incidentReports,
  incidentStatusLogs,
  responderAssignments,
  responders,
} from "@/db/schema";
import { canManageIncidents, requireAuth } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { ApiError, jsonCreated, newId, parseJson, withApiErrorHandling } from "@/lib/api/http";
import { assignResponderSchema } from "@/lib/api/schemas";
import { canTransitionIncidentStatus } from "@/lib/domain/incident-status";
import type { IncidentStatus } from "@/lib/domain/constants";
import { createNotificationsForUsers } from "@/lib/services/notifications";
import { refreshResponderAvailability } from "@/lib/services/responder-availability";

export const POST = withApiErrorHandling(
  async (request, context: { params: Promise<{ id: string }> }) => {
    const auth = await requireAuth(request);
    if (!canManageIncidents(auth.user.role)) {
      throw new ApiError(403, "Only command staff can assign responders");
    }

    const { id } = await context.params;
    const body = await parseJson(request, assignResponderSchema);

    const [incident] = await db
      .select()
      .from(incidentReports)
      .where(eq(incidentReports.id, id));

    if (!incident) {
      throw new ApiError(404, "Incident not found");
    }

    const [responder] = await db
      .select()
      .from(responders)
      .where(eq(responders.id, body.responderId));

    if (!responder) {
      throw new ApiError(404, "Responder not found");
    }

    const fromStatus = incident.status as IncidentStatus;
    const nextStatus: IncidentStatus = canTransitionIncidentStatus(fromStatus, "assigned")
      ? "assigned"
      : fromStatus;

    const [assignment] = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(responderAssignments)
        .values({
          id: newId(),
          incidentReportId: id,
          responderId: body.responderId,
          assignedByUserId: auth.user.id,
          assignedVehicle: body.assignedVehicle ?? responder.vehicle,
          etaMinutes: body.etaMinutes ?? null,
          notes: body.notes ?? null,
          status: "assigned",
        })
        .returning();

      await tx
        .update(incidentReports)
        .set({
          assignedResponderId: body.responderId,
          status: nextStatus,
        })
        .where(eq(incidentReports.id, id));

      await tx
        .update(responders)
        .set({ isAvailable: false })
        .where(eq(responders.id, body.responderId));

      if (nextStatus !== fromStatus) {
        await tx.insert(incidentStatusLogs).values({
          id: newId(),
          incidentReportId: id,
          fromStatus,
          toStatus: nextStatus,
          remarks: body.notes ?? "Responder assigned",
          changedByUserId: auth.user.id,
        });
      }

      return [created];
    });

    if (incident.assignedResponderId !== body.responderId) {
      await refreshResponderAvailability([incident.assignedResponderId]);
    }

    await createNotificationsForUsers([responder.userId], {
      type: "responder_assignment",
      title: "New incident assignment",
      body: incident.title,
      data: { incidentId: id, assignmentId: assignment.id },
    });

    await writeAuditLog({
      request,
      actorUserId: auth.user.id,
      action: "incident.assign_responder",
      entityType: "incident_report",
      entityId: id,
      metadata: { responderId: body.responderId, assignmentId: assignment.id },
    });

    return jsonCreated({ assignment });
  },
);
