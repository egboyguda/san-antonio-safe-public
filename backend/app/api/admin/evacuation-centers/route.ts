import { asc } from "drizzle-orm";
import { db } from "@/db";
import { evacuationCenters } from "@/db/schema";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { jsonCreated, jsonOk, newId, parseJson, withApiErrorHandling } from "@/lib/api/http";
import { evacuationCenterSchema } from "@/lib/api/schemas";
import { nullablePointFromLatLng } from "@/lib/domain/geo";

export const GET = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  requireRole(auth, ["admin"]);
  const centers = await db.select().from(evacuationCenters).orderBy(asc(evacuationCenters.name));
  return jsonOk({ centers });
});

export const POST = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  requireRole(auth, ["admin"]);
  const body = await parseJson(request, evacuationCenterSchema);
  const [center] = await db.insert(evacuationCenters).values({ id: newId(), ...body, location: nullablePointFromLatLng(body) }).returning();
  await writeAuditLog({ request, actorUserId: auth.user.id, action: "admin.evacuation_center.create", entityType: "evacuation_center", entityId: center.id });
  return jsonCreated({ center });
});
