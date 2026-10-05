import { asc } from "drizzle-orm";
import { db } from "@/db";
import { barangays } from "@/db/schema";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { jsonCreated, jsonOk, newId, parseJson, withApiErrorHandling } from "@/lib/api/http";
import { barangayUpsertSchema } from "@/lib/api/schemas";
import { nullablePointFromLatLng } from "@/lib/domain/geo";

export const GET = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  requireRole(auth, ["admin"]);
  const rows = await db.select().from(barangays).orderBy(asc(barangays.name));
  return jsonOk({ barangays: rows });
});

export const POST = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  requireRole(auth, ["admin"]);
  const body = await parseJson(request, barangayUpsertSchema);

  const [barangay] = await db
    .insert(barangays)
    .values({
      id: newId(),
      name: body.name,
      psgcCode: body.psgcCode ?? null,
      contactPerson: body.contactPerson ?? null,
      contactNumber: body.contactNumber ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      centerLocation: nullablePointFromLatLng(body),
    })
    .returning();

  await writeAuditLog({
    request,
    actorUserId: auth.user.id,
    action: "admin.barangay.create",
    entityType: "barangay",
    entityId: barangay.id,
  });

  return jsonCreated({ barangay });
});
