import { eq } from "drizzle-orm";
import { db } from "@/db";
import { alertTemplates } from "@/db/schema";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { ApiError, jsonNoContent, jsonOk, parseJson, withApiErrorHandling } from "@/lib/api/http";
import { alertTemplateSchema } from "@/lib/api/schemas";

export const PATCH = withApiErrorHandling(async (request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(request);
  requireRole(auth, ["admin"]);
  const { id } = await context.params;
  const body = await parseJson(request, alertTemplateSchema.partial());
  const [template] = await db.update(alertTemplates).set(body).where(eq(alertTemplates.id, id)).returning();
  if (!template) throw new ApiError(404, "Alert template not found");
  await writeAuditLog({ request, actorUserId: auth.user.id, action: "admin.alert_template.update", entityType: "alert_template", entityId: id });
  return jsonOk({ template });
});

export const DELETE = withApiErrorHandling(async (request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(request);
  requireRole(auth, ["admin"]);
  const { id } = await context.params;
  await db.update(alertTemplates).set({ isActive: false }).where(eq(alertTemplates.id, id));
  await writeAuditLog({ request, actorUserId: auth.user.id, action: "admin.alert_template.deactivate", entityType: "alert_template", entityId: id });
  return jsonNoContent();
});
