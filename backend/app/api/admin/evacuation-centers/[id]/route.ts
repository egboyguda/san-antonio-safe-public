import { eq } from "drizzle-orm";
import { db } from "@/db";
import { evacuationCenters } from "@/db/schema";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { ApiError, jsonNoContent, jsonOk, parseJson, withApiErrorHandling } from "@/lib/api/http";
import { evacuationCenterSchema } from "@/lib/api/schemas";
import { nullablePointFromLatLng } from "@/lib/domain/geo";

export const PATCH = withApiErrorHandling(async (request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(request);
  requireRole(auth, ["admin"]);
  const { id } = await context.params;
  const body = await parseJson(request, evacuationCenterSchema.partial());
  const update: Partial<typeof evacuationCenters.$inferInsert> = { ...body };

  if ("latitude" in body && "longitude" in body) {
    update.location = nullablePointFromLatLng(body);
  }

  const [center] = await db
    .update(evacuationCenters)
    .set(update)
    .where(eq(evacuationCenters.id, id))
    .returning();
  if (!center) throw new ApiError(404, "Evacuation center not found");
  await writeAuditLog({ request, actorUserId: auth.user.id, action: "admin.evacuation_center.update", entityType: "evacuation_center", entityId: id });
  return jsonOk({ center });
});

export const DELETE = withApiErrorHandling(async (request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(request);
  requireRole(auth, ["admin"]);
  const { id } = await context.params;
  await db.update(evacuationCenters).set({ isActive: false }).where(eq(evacuationCenters.id, id));
  await writeAuditLog({ request, actorUserId: auth.user.id, action: "admin.evacuation_center.deactivate", entityType: "evacuation_center", entityId: id });
  return jsonNoContent();
});
