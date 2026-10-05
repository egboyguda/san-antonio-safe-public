import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { jsonCreated, newId, parseJson, withApiErrorHandling } from "@/lib/api/http";
import { deviceTokenSchema } from "@/lib/api/schemas";

export const POST = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  const body = await parseJson(request, deviceTokenSchema);

  const [device] = await db
    .insert(deviceTokens)
    .values({
      id: newId(),
      userId: auth.user.id,
      token: body.token,
      platform: body.platform,
      deviceId: body.deviceId ?? null,
      appVersion: body.appVersion ?? null,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: deviceTokens.token,
      set: {
        userId: auth.user.id,
        platform: body.platform,
        deviceId: body.deviceId ?? null,
        appVersion: body.appVersion ?? null,
        lastSeenAt: new Date(),
      },
    })
    .returning();

  await writeAuditLog({
    request,
    actorUserId: auth.user.id,
    action: "device.register",
    entityType: "device_token",
    entityId: device.id,
  });

  return jsonCreated({ device });
});

