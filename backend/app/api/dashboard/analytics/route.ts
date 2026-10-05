import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { barangays, incidentCategories, incidentReports } from "@/db/schema";
import { canManageIncidents, requireAuth } from "@/lib/api/auth";
import { ApiError, jsonOk, withApiErrorHandling } from "@/lib/api/http";

export const GET = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!canManageIncidents(auth.user.role)) {
    throw new ApiError(403, "Only command staff can view analytics");
  }

  const [byBarangay, byType, monthlyTrend, averageResponse] = await Promise.all([
    db
      .select({ barangay: barangays.name, count: count() })
      .from(incidentReports)
      .leftJoin(barangays, eq(incidentReports.barangayId, barangays.id))
      .groupBy(barangays.name)
      .orderBy(desc(count())),
    db
      .select({ category: incidentCategories.name, count: count() })
      .from(incidentReports)
      .leftJoin(
        incidentCategories,
        eq(incidentReports.incidentCategoryId, incidentCategories.id),
      )
      .groupBy(incidentCategories.name)
      .orderBy(desc(count())),
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${incidentReports.reportedAt}), 'YYYY-MM')`,
        count: count(),
      })
      .from(incidentReports)
      .groupBy(sql`date_trunc('month', ${incidentReports.reportedAt})`)
      .orderBy(sql`date_trunc('month', ${incidentReports.reportedAt})`),
    db
      .select({
        seconds: sql<number>`avg(extract(epoch from (${incidentReports.resolvedAt} - ${incidentReports.reportedAt})))`.mapWith(Number),
      })
      .from(incidentReports)
      .where(eq(incidentReports.status, "resolved")),
  ]);

  return jsonOk({
    incidentsPerBarangay: byBarangay,
    commonIncidentTypes: byType,
    monthlyTrend,
    averageResponseSeconds: averageResponse[0]?.seconds ?? null,
  });
});
