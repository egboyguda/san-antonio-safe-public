import { and, asc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { barangays, responders, user } from "@/db/schema";
import { canManageIncidents, requireAuth } from "@/lib/api/auth";
import { ApiError, jsonOk, withApiErrorHandling } from "@/lib/api/http";
import { responderListQuerySchema } from "@/lib/api/schemas";

export const GET = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!canManageIncidents(auth.user.role)) {
    throw new ApiError(403, "Only authorized staff can list responders");
  }

  const query = responderListQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  const conditions: SQL[] = [];
  if (query.available) {
    conditions.push(eq(responders.isAvailable, query.available === "true"));
  }
  if (query.barangayId) {
    conditions.push(eq(responders.barangayId, query.barangayId));
  }

  const rows = await db
    .select({
      id: responders.id,
      userId: responders.userId,
      name: user.name,
      email: user.email,
      barangayId: responders.barangayId,
      barangayName: barangays.name,
      teamName: responders.teamName,
      specialization: responders.specialization,
      vehicle: responders.vehicle,
      isAvailable: responders.isAvailable,
      createdAt: responders.createdAt,
      updatedAt: responders.updatedAt,
    })
    .from(responders)
    .innerJoin(user, eq(responders.userId, user.id))
    .leftJoin(barangays, eq(responders.barangayId, barangays.id))
    .where(and(...conditions))
    .orderBy(asc(user.name));

  return jsonOk({ responders: rows });
});
