import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, withApiErrorHandling } from "@/lib/api/http";

export const GET = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, auth.user.id))
    .orderBy(desc(notifications.createdAt));

  return jsonOk({ notifications: rows });
});
