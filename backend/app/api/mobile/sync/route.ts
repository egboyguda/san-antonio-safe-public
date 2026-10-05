import { and, asc, desc, eq, gt, inArray, type SQL } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import {
  alertRecipients,
  barangays,
  deviceTokens,
  emergencyAlerts,
  emergencyContacts,
  evacuationCenters,
  incidentCategories,
  incidentPhotos,
  incidentReports,
  notifications,
  offlineSyncBatches,
  responders,
  user,
  userProfiles,
} from "@/db/schema";
import { requireAuth } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { getSearchParam, jsonOk, newId, parseJson, withApiErrorHandling } from "@/lib/api/http";
import { syncPullQuerySchema, syncPushSchema } from "@/lib/api/schemas";
import { INCIDENT_STATUSES, SEVERITY_LEVELS } from "@/lib/domain/constants";
import { createIncidentReport } from "@/lib/services/incidents";

type SyncPushInput = z.infer<typeof syncPushSchema>;
type SyncOperation = SyncPushInput["operations"][number];
type SyncProfilePayload = Extract<SyncOperation, { type: "update_profile" }>["payload"];
type SyncDevicePayload = Extract<SyncOperation, { type: "register_device" }>["payload"];

function photoWithDownloadUrl(photo: typeof incidentPhotos.$inferSelect) {
  return {
    ...photo,
    downloadUrl: `/api/incidents/${photo.incidentReportId}/photos/${photo.id}`,
  };
}
type SyncOperationResult = {
  clientOperationId: string;
  type: SyncOperation["type"];
  status: "created" | "duplicate" | "updated" | "registered" | "failed";
  serverId?: string | null;
  clientReportId?: string | null;
  error?: string;
};
async function updateProfileFromSync(userId: string, body: SyncProfilePayload) {
  if (Object.keys(body).length === 0) {
    return null;
  }

  if ("name" in body && body.name) {
    await db.update(user).set({ name: body.name }).where(eq(user.id, userId));
  }

  const profileUpdate: Partial<typeof userProfiles.$inferInsert> = {};
  if ("mobileNumber" in body) profileUpdate.mobileNumber = body.mobileNumber ?? null;
  if ("barangayId" in body) profileUpdate.barangayId = body.barangayId ?? null;
  if ("address" in body) profileUpdate.address = body.address ?? null;
  if ("emergencyContactName" in body) {
    profileUpdate.emergencyContactName = body.emergencyContactName ?? null;
  }
  if ("emergencyContactNumber" in body) {
    profileUpdate.emergencyContactNumber = body.emergencyContactNumber ?? null;
  }

  if (Object.keys(profileUpdate).length === 0) {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile ?? null;
  }

  const [profile] = await db
    .insert(userProfiles)
    .values({ id: newId(), userId, ...profileUpdate })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: profileUpdate,
    })
    .returning();

  return profile;
}

async function registerDeviceFromSync(userId: string, body: SyncDevicePayload) {
  if (!("token" in body)) {
    return null;
  }

  const now = new Date();
  const [device] = await db
    .insert(deviceTokens)
    .values({
      id: newId(),
      userId,
      token: body.token,
      platform: body.platform,
      deviceId: body.deviceId ?? null,
      appVersion: body.appVersion ?? null,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: deviceTokens.token,
      set: {
        userId,
        platform: body.platform,
        deviceId: body.deviceId ?? null,
        appVersion: body.appVersion ?? null,
        lastSeenAt: now,
      },
    })
    .returning();

  return device;
}

async function loadReferenceData() {
  const [barangayRows, categoryRows, contactRows, evacuationRows] = await Promise.all([
    db.select().from(barangays).orderBy(asc(barangays.name)),
    db
      .select()
      .from(incidentCategories)
      .where(eq(incidentCategories.isActive, true))
      .orderBy(asc(incidentCategories.name)),
    db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.isActive, true))
      .orderBy(asc(emergencyContacts.sortOrder), asc(emergencyContacts.name)),
    db
      .select()
      .from(evacuationCenters)
      .where(eq(evacuationCenters.isActive, true))
      .orderBy(asc(evacuationCenters.name)),
  ]);

  return {
    barangays: barangayRows,
    incidentCategories: categoryRows,
    emergencyContacts: contactRows,
    evacuationCenters: evacuationRows,
    incidentStatuses: INCIDENT_STATUSES,
    severityLevels: SEVERITY_LEVELS,
  };
}

async function loadIncidentsForSync(userId: string, role: string, since?: Date) {
  const conditions: SQL[] = [];

  if (since) {
    conditions.push(gt(incidentReports.updatedAt, since));
  }

  if (role === "resident") {
    conditions.push(eq(incidentReports.reporterUserId, userId));
  }

  if (role === "responder") {
    const [responder] = await db
      .select({ id: responders.id })
      .from(responders)
      .where(eq(responders.userId, userId));

    if (!responder) {
      return [];
    }

    conditions.push(eq(incidentReports.assignedResponderId, responder.id));
  }

  if (role === "barangay_officer") {
    const [profile] = await db
      .select({ barangayId: userProfiles.barangayId })
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));

    if (profile?.barangayId) {
      conditions.push(eq(incidentReports.barangayId, profile.barangayId));
    }
  }

  return db
    .select()
    .from(incidentReports)
    .where(and(...conditions))
    .orderBy(desc(incidentReports.updatedAt));
}

async function loadAlertsForSync(userId: string, since?: Date) {
  const recipientRows = await db
    .select({ alertId: alertRecipients.alertId, readAt: alertRecipients.readAt })
    .from(alertRecipients)
    .where(eq(alertRecipients.userId, userId));

  const alertIds = recipientRows.map((row) => row.alertId);
  if (alertIds.length === 0) {
    return { alerts: [], alertRecipients: recipientRows };
  }

  const conditions: SQL[] = [inArray(emergencyAlerts.id, alertIds)];
  if (since) {
    conditions.push(gt(emergencyAlerts.updatedAt, since));
  }

  const alerts = await db
    .select()
    .from(emergencyAlerts)
    .where(and(...conditions))
    .orderBy(desc(emergencyAlerts.sentAt));

  return { alerts, alertRecipients: recipientRows };
}

export const GET = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  const query = syncPullQuerySchema.parse({
    since: getSearchParam(request, "since") ?? undefined,
  });

  const [reference, incidents, alertsResult, notificationRows] = await Promise.all([
    loadReferenceData(),
    loadIncidentsForSync(auth.user.id, auth.user.role, query.since),
    loadAlertsForSync(auth.user.id, query.since),
    db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, auth.user.id),
          ...(query.since ? [gt(notifications.createdAt, query.since)] : []),
        ),
      )
      .orderBy(desc(notifications.createdAt)),
  ]);

  const incidentIds = incidents.map((incident) => incident.id);
  const photoRows = incidentIds.length > 0
    ? await db
        .select()
        .from(incidentPhotos)
        .where(inArray(incidentPhotos.incidentReportId, incidentIds))
        .orderBy(desc(incidentPhotos.createdAt))
    : [];

  return jsonOk({
    serverTime: new Date().toISOString(),
    reference,
    incidents,
    incidentPhotos: photoRows.map(photoWithDownloadUrl),
    alerts: alertsResult.alerts,
    alertRecipients: alertsResult.alertRecipients,
    notifications: notificationRows,
  });
});

export const POST = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  const body = await parseJson(request, syncPushSchema);

  const [existingBatch] = await db
    .select()
    .from(offlineSyncBatches)
    .where(
      and(
        eq(offlineSyncBatches.userId, auth.user.id),
        eq(offlineSyncBatches.clientBatchId, body.clientBatchId),
      ),
    );

  if (existingBatch) {
    return jsonOk({
      serverTime: new Date().toISOString(),
      duplicateBatch: true,
      results: existingBatch.result.operationResults ?? [],
    });
  }

  const operationResults: SyncOperationResult[] = [];

  for (const operation of body.operations) {
    try {
      if (operation.type === "create_incident") {
        const result = await createIncidentReport({
          reporterUserId: auth.user.id,
          body: operation.payload,
        });

        operationResults.push({
          clientOperationId: operation.clientOperationId,
          type: operation.type,
          status: result.duplicate ? "duplicate" : "created",
          serverId: result.incident.id,
          clientReportId: result.incident.clientReportId,
        });
        continue;
      }

      if (operation.type === "update_profile") {
        const profile = await updateProfileFromSync(auth.user.id, operation.payload);
        operationResults.push({
          clientOperationId: operation.clientOperationId,
          type: operation.type,
          status: "updated",
          serverId: profile?.id ?? auth.user.id,
        });
        continue;
      }

      if (operation.type === "register_device") {
        const device = await registerDeviceFromSync(auth.user.id, operation.payload);
        operationResults.push({
          clientOperationId: operation.clientOperationId,
          type: operation.type,
          status: "registered",
          serverId: device?.id ?? null,
        });
      }
    } catch (error) {
      operationResults.push({
        clientOperationId: operation.clientOperationId,
        type: operation.type,
        status: "failed",
        error: error instanceof Error ? error.message : "Operation failed",
      });
    }
  }

  const hasFailures = operationResults.some((result) => result.status === "failed");
  const batchResult = { operationResults };

  await db
    .insert(offlineSyncBatches)
    .values({
      id: newId(),
      userId: auth.user.id,
      clientBatchId: body.clientBatchId,
      deviceId: body.deviceId ?? null,
      status: hasFailures ? "partial_failure" : "processed",
      result: batchResult,
      completedAt: new Date(),
    })
    .onConflictDoNothing();

  await writeAuditLog({
    request,
    actorUserId: auth.user.id,
    action: "mobile.sync",
    entityType: "offline_sync_batch",
    entityId: body.clientBatchId,
    metadata: { operationCount: body.operations.length, hasFailures },
  });

  return jsonOk({
    serverTime: new Date().toISOString(),
    duplicateBatch: false,
    results: operationResults,
  });
});