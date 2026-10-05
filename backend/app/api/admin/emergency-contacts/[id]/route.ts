import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emergencyContacts } from "@/db/schema";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { ApiError, jsonNoContent, jsonOk, parseJson, withApiErrorHandling } from "@/lib/api/http";
import { emergencyContactSchema } from "@/lib/api/schemas";

export const PATCH = withApiErrorHandling(async (request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(request);
  requireRole(auth, ["admin"]);
  const { id } = await context.params;
  const body = await parseJson(request, emergencyContactSchema.partial());
  const [contact] = await db.update(emergencyContacts).set(body).where(eq(emergencyContacts.id, id)).returning();
  if (!contact) throw new ApiError(404, "Emergency contact not found");
  await writeAuditLog({ request, actorUserId: auth.user.id, action: "admin.contact.update", entityType: "emergency_contact", entityId: id });
  return jsonOk({ contact });
});

export const DELETE = withApiErrorHandling(async (request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(request);
  requireRole(auth, ["admin"]);
  const { id } = await context.params;
  await db.update(emergencyContacts).set({ isActive: false }).where(eq(emergencyContacts.id, id));
  await writeAuditLog({ request, actorUserId: auth.user.id, action: "admin.contact.deactivate", entityType: "emergency_contact", entityId: id });
  return jsonNoContent();
});
