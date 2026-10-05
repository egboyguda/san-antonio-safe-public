import { count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { emergencyAlerts, incidentReports, responders } from "@/db/schema";
import { canManageIncidents, requireAuth } from "@/lib/api/auth";
import { ApiError, jsonOk, withApiErrorHandling } from "@/lib/api/http";

async function countWhere(statuses?: string[]) {
  const query = db.select({ value: count() }).from(incidentReports);
  const [row] = statuses
    ? await query.where(inArray(incidentReports.status, statuses))
    : await query;
  return row.value;
}

export const GET = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!canManageIncidents(auth.user.role)) {
    throw new ApiError(403, "Only command staff can view dashboard summaries");
  }

  const [alertsRow, respondersRow] = await Promise.all([
    db.select({ value: count() }).from(emergencyAlerts),
    db.select({ value: count() }).from(responders).where(eq(responders.isAvailable, true)),
  ]);

  const [totalReports, pendingReports, activeIncidents, resolvedIncidents] =
    await Promise.all([
      countWhere(),
      countWhere(["pending"]),
      countWhere(["verified", "assigned", "responding"]),
      countWhere(["resolved"]),
    ]);

  return jsonOk({
    totalReports,
    pendingReports,
    activeIncidents,
    resolvedIncidents,
    alertsSent: alertsRow[0]?.value ?? 0,
    availableResponders: respondersRow[0]?.value ?? 0,
  });
});
