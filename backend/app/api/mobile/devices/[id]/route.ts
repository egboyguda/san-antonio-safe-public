import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { jsonNoContent, withApiErrorHandling } from "@/lib/api/http";

export const DELETE = withApiErrorHandling(
  async (request, context: { params: Promise<{ id: string }> }) => {
    const auth = await requireAuth(request);
    const { id } = await context.params;

    await db
      .delete(deviceTokens)
      .where(and(eq(deviceTokens.id, id), eq(deviceTokens.userId, auth.user.id)));

    await writeAuditLog({
      request,
      actorUserId: auth.user.id,
      action: "device.delete",
      entityType: "device_token",
      entityId: id,
    });

    return jsonNoContent();
  },
);
