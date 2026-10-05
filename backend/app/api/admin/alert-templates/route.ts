import { asc } from "drizzle-orm";
import { db } from "@/db";
import { alertTemplates } from "@/db/schema";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { jsonCreated, jsonOk, newId, parseJson, withApiErrorHandling } from "@/lib/api/http";
import { alertTemplateSchema } from "@/lib/api/schemas";

export const GET = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  requireRole(auth, ["admin"]);
  const templates = await db.select().from(alertTemplates).orderBy(asc(alertTemplates.name));
  return jsonOk({ templates });
});

export const POST = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  requireRole(auth, ["admin"]);
  const body = await parseJson(request, alertTemplateSchema);
  const [template] = await db
    .insert(alertTemplates)
    .values({ id: newId(), ...body, createdByUserId: auth.user.id })
    .returning();
  await writeAuditLog({ request, actorUserId: auth.user.id, action: "admin.alert_template.create", entityType: "alert_template", entityId: template.id });
  return jsonCreated({ template });
});
