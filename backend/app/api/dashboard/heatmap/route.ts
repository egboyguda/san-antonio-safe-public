import { count, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { incidentReports } from "@/db/schema";
import { canManageIncidents, requireAuth } from "@/lib/api/auth";
import { ApiError, jsonOk, withApiErrorHandling } from "@/lib/api/http";

export const GET = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!canManageIncidents(auth.user.role)) {
    throw new ApiError(403, "Only command staff can view heatmaps");
  }

  const cell = sql`ST_SnapToGrid(${incidentReports.location}, 0.01)`;
  const points = await db
    .select({
      latitude: sql<number>`ST_Y(${cell})`.mapWith(Number),
      longitude: sql<number>`ST_X(${cell})`.mapWith(Number),
      count: count(),
    })
    .from(incidentReports)
    .groupBy(cell)
    .orderBy(desc(count()));

  return jsonOk({ points });
});
