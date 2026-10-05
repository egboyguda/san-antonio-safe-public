import { eq } from "drizzle-orm";
import { db } from "@/db";
import { barangays } from "@/db/schema";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { ApiError, jsonNoContent, jsonOk, parseJson, withApiErrorHandling } from "@/lib/api/http";
import { barangayUpsertSchema } from "@/lib/api/schemas";
import { nullablePointFromLatLng } from "@/lib/domain/geo";

export const PATCH = withApiErrorHandling(
  async (request, context: { params: Promise<{ id: string }> }) => {
    const auth = await requireAuth(request);
    requireRole(auth, ["admin"]);
    const { id } = await context.params;
    const body = await parseJson(request, barangayUpsertSchema.partial());
    const update: Partial<typeof barangays.$inferInsert> = { ...body };

    if ("latitude" in body && "longitude" in body) {
      update.centerLocation = nullablePointFromLatLng(body);
    }

    const [barangay] = await db
      .update(barangays)
      .set(update)
      .where(eq(barangays.id, id))
      .returning();

    if (!barangay) {
      throw new ApiError(404, "Barangay not found");
    }

    await writeAuditLog({
      request,
      actorUserId: auth.user.id,
      action: "admin.barangay.update",
      entityType: "barangay",
      entityId: id,
    });

    return jsonOk({ barangay });
  },
);

export const DELETE = withApiErrorHandling(
  async (request, context: { params: Promise<{ id: string }> }) => {
    const auth = await requireAuth(request);
    requireRole(auth, ["admin"]);
    const { id } = await context.params;
    await db.delete(barangays).where(eq(barangays.id, id));
    await writeAuditLog({
      request,
      actorUserId: auth.user.id,
      action: "admin.barangay.delete",
      entityType: "barangay",
      entityId: id,
    });
    return jsonNoContent();
  },
);
