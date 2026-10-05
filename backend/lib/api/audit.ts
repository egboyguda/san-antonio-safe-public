import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { newId } from "./http";

export async function writeAuditLog(input: {
  request?: Request;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: newId(),
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? {},
      ipAddress: input.request?.headers.get("x-forwarded-for") ?? null,
      userAgent: input.request?.headers.get("user-agent") ?? null,
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
