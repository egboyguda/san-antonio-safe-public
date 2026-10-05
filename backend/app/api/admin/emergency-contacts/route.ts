import { asc } from "drizzle-orm";
import { db } from "@/db";
import { emergencyContacts } from "@/db/schema";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { jsonCreated, jsonOk, newId, parseJson, withApiErrorHandling } from "@/lib/api/http";
import { emergencyContactSchema } from "@/lib/api/schemas";

export const GET = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  requireRole(auth, ["admin"]);
  const contacts = await db
    .select()
    .from(emergencyContacts)
    .orderBy(asc(emergencyContacts.sortOrder), asc(emergencyContacts.name));
  return jsonOk({ contacts });
});

export const POST = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  requireRole(auth, ["admin"]);
  const body = await parseJson(request, emergencyContactSchema);
  const [contact] = await db
    .insert(emergencyContacts)
    .values({ id: newId(), ...body })
    .returning();
  await writeAuditLog({ request, actorUserId: auth.user.id, action: "admin.contact.create", entityType: "emergency_contact", entityId: contact.id });
  return jsonCreated({ contact });
});
