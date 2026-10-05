import { asc } from "drizzle-orm";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { jsonOk, parseJson, withApiErrorHandling } from "@/lib/api/http";
import { systemSettingsPatchSchema } from "@/lib/api/schemas";

export const GET = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  requireRole(auth, ["admin"]);
  const settings = await db.select().from(systemSettings).orderBy(asc(systemSettings.key));
  return jsonOk({ settings });
});

export const PATCH = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  requireRole(auth, ["admin"]);
  const body = await parseJson(request, systemSettingsPatchSchema);
  const entries = Object.entries(body);

  for (const [key, value] of entries) {
    await db
      .insert(systemSettings)
      .values({ key, value: { value }, updatedByUserId: auth.user.id })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: { value }, updatedByUserId: auth.user.id },
      });
  }

  await writeAuditLog({
    request,
    actorUserId: auth.user.id,
    action: "admin.settings.update",
    entityType: "system_settings",
    metadata: { keys: entries.map(([key]) => key) },
  });

  const settings = await db.select().from(systemSettings).orderBy(asc(systemSettings.key));
  return jsonOk({ settings });
});
