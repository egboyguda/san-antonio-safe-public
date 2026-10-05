import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { alertRecipients } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth";
import { ApiError, jsonOk, withApiErrorHandling } from "@/lib/api/http";

export const POST = withApiErrorHandling(
  async (request, context: { params: Promise<{ id: string }> }) => {
    const auth = await requireAuth(request);
    const { id } = await context.params;

    const [recipient] = await db
      .update(alertRecipients)
      .set({ readAt: new Date() })
      .where(and(eq(alertRecipients.alertId, id), eq(alertRecipients.userId, auth.user.id)))
      .returning();

    if (!recipient) {
      throw new ApiError(404, "Alert recipient not found");
    }

    return jsonOk({ recipient });
  },
);
