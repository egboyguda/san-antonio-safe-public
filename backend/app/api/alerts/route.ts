import { count, desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import {
  alertRecipients,
  emergencyAlerts,
  user,
  userProfiles,
} from "@/db/schema";
import { canManageIncidents, requireAuth } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import {
  ApiError,
  jsonCreated,
  jsonOk,
  newId,
  parseJson,
  withApiErrorHandling,
} from "@/lib/api/http";
import { createAlertSchema } from "@/lib/api/schemas";
import { nullablePointFromLatLng } from "@/lib/domain/geo";
import { createNotificationsForUsers } from "@/lib/services/notifications";

type CreateAlertInput = z.infer<typeof createAlertSchema>;

async function resolveRecipients(body: CreateAlertInput) {
  if (body.targetType === "user") {
    return body.targetUserId ? [body.targetUserId] : [];
  }

  if (body.targetType === "group" && body.targetRole) {
    const rows = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.role, body.targetRole));
    return rows.map((row) => row.id);
  }

  if (
    (body.targetType === "barangay" || body.targetType === "area") &&
    body.targetBarangayId
  ) {
    const rows = await db
      .select({ id: userProfiles.userId })
      .from(userProfiles)
      .where(eq(userProfiles.barangayId, body.targetBarangayId));
    return rows.map((row) => row.id);
  }

  const rows = await db.select({ id: user.id }).from(user).where(eq(user.banned, false));
  return rows.map((row) => row.id);
}

export const GET = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);

  if (canManageIncidents(auth.user.role)) {
    const [alerts, recipientCounts] = await Promise.all([
      db
        .select()
        .from(emergencyAlerts)
        .orderBy(desc(emergencyAlerts.sentAt)),
      db
        .select({ alertId: alertRecipients.alertId, value: count() })
        .from(alertRecipients)
        .groupBy(alertRecipients.alertId),
    ]);
    const countsByAlert = new Map(
      recipientCounts.map((row) => [row.alertId, row.value]),
    );
    return jsonOk({
      alerts: alerts.map((alert) => ({
        ...alert,
        recipientCount: countsByAlert.get(alert.id) ?? 0,
      })),
    });
  }

  const rows = await db
    .select({ alert: emergencyAlerts, recipient: alertRecipients })
    .from(alertRecipients)
    .innerJoin(emergencyAlerts, eq(alertRecipients.alertId, emergencyAlerts.id))
    .where(eq(alertRecipients.userId, auth.user.id))
    .orderBy(desc(emergencyAlerts.sentAt));

  return jsonOk({ alerts: rows });
});

export const POST = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!canManageIncidents(auth.user.role)) {
    throw new ApiError(403, "Only authorized staff can send alerts");
  }

  const body = await parseJson(request, createAlertSchema);
  const alertId = newId();
  const recipientUserIds = await resolveRecipients(body);
  const centerLocation = nullablePointFromLatLng(body);

  const [alert] = await db
    .insert(emergencyAlerts)
    .values({
      id: alertId,
      title: body.title,
      message: body.message,
      alertType: body.alertType,
      severityLevel: body.severityLevel,
      targetType: body.targetType,
      targetBarangayId: body.targetBarangayId ?? null,
      targetRole: body.targetRole ?? null,
      targetUserId: body.targetUserId ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      centerLocation,
      radiusMeters: body.radiusMeters ?? null,
      sentByUserId: auth.user.id,
    })
    .returning();

  const notificationResult = await createNotificationsForUsers(recipientUserIds, {
    type: "alert",
    title: body.title,
    body: body.message,
    data: { alertId, severityLevel: body.severityLevel, alertType: body.alertType },
  });

  if (recipientUserIds.length > 0) {
    await db.insert(alertRecipients).values(
      recipientUserIds.map((userId) => ({
        id: newId(),
        alertId,
        userId,
      })),
    );
  }

  await writeAuditLog({
    request,
    actorUserId: auth.user.id,
    action: "alert.send",
    entityType: "emergency_alert",
    entityId: alertId,
    metadata: { targetType: body.targetType, recipientCount: recipientUserIds.length },
  });

  return jsonCreated({
    alert,
    recipients: recipientUserIds.length,
    notifications: notificationResult,
  });
});
