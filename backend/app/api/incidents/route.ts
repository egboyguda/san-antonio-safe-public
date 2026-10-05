import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  barangays,
  incidentCategories,
  incidentReports,
  responders,
  user,
  userProfiles,
} from "@/db/schema";
import { requireAuth } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import {
  ApiError,
  jsonCreated,
  jsonOk,
  parseJson,
  withApiErrorHandling,
} from "@/lib/api/http";
import { createIncidentSchema, incidentListQuerySchema } from "@/lib/api/schemas";
import { isAppRole } from "@/lib/domain/constants";
import { createIncidentReport } from "@/lib/services/incidents";

export const GET = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  const query = incidentListQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  const conditions: SQL[] = [];

  if (query.status) conditions.push(eq(incidentReports.status, query.status));
  if (query.barangayId) conditions.push(eq(incidentReports.barangayId, query.barangayId));
  if (query.severityLevel) {
    conditions.push(eq(incidentReports.severityLevel, query.severityLevel));
  }
  if (query.categoryId) {
    conditions.push(eq(incidentReports.incidentCategoryId, query.categoryId));
  }
  if (query.q) {
    const pattern = `%${query.q}%`;
    const search = or(
      ilike(incidentReports.title, pattern),
      ilike(incidentReports.description, pattern),
      ilike(incidentReports.approximateAddress, pattern),
    );
    if (search) conditions.push(search);
  }

  if (auth.user.role === "resident") {
    conditions.push(eq(incidentReports.reporterUserId, auth.user.id));
  }
  if (auth.user.role === "responder") {
    const [responder] = await db
      .select({ id: responders.id })
      .from(responders)
      .where(eq(responders.userId, auth.user.id));
    if (!responder) return jsonOk({ incidents: [], pagination: { total: 0, limit: query.limit ?? null, offset: query.offset } });
    conditions.push(eq(incidentReports.assignedResponderId, responder.id));
  }
  if (auth.user.role === "barangay_officer" && !query.barangayId) {
    const [profile] = await db
      .select({ barangayId: userProfiles.barangayId })
      .from(userProfiles)
      .where(eq(userProfiles.userId, auth.user.id));
    if (profile?.barangayId) {
      conditions.push(eq(incidentReports.barangayId, profile.barangayId));
    }
  }

  const where = and(...conditions);
  let incidentQuery = db
    .select()
    .from(incidentReports)
    .where(where)
    .orderBy(desc(incidentReports.reportedAt))
    .offset(query.offset)
    .$dynamic();
  if (query.limit) incidentQuery = incidentQuery.limit(query.limit);

  const [incidents, totalRows] = await Promise.all([
    incidentQuery,
    db.select({ value: count() }).from(incidentReports).where(where),
  ]);
  const categoryIds = [...new Set(incidents.map((item) => item.incidentCategoryId))];
  const barangayIds = [...new Set(incidents.flatMap((item) => item.barangayId ? [item.barangayId] : []))];
  const reporterIds = [...new Set(incidents.map((item) => item.reporterUserId))];
  const responderIds = [...new Set(incidents.flatMap((item) => item.assignedResponderId ? [item.assignedResponderId] : []))];

  const [categoryRows, barangayRows, reporterRows, responderRows] = await Promise.all([
    categoryIds.length
      ? db.select({ id: incidentCategories.id, name: incidentCategories.name })
          .from(incidentCategories).where(inArray(incidentCategories.id, categoryIds))
      : [],
    barangayIds.length
      ? db.select({ id: barangays.id, name: barangays.name })
          .from(barangays).where(inArray(barangays.id, barangayIds))
      : [],
    reporterIds.length
      ? db.select({ id: user.id, name: user.name })
          .from(user).where(inArray(user.id, reporterIds))
      : [],
    responderIds.length
      ? db.select({ id: responders.id, name: user.name, teamName: responders.teamName })
          .from(responders)
          .innerJoin(user, eq(responders.userId, user.id))
          .where(inArray(responders.id, responderIds))
      : [],
  ]);

  const categoriesById = new Map(categoryRows.map((row) => [row.id, row.name]));
  const barangaysById = new Map(barangayRows.map((row) => [row.id, row.name]));
  const reportersById = new Map(reporterRows.map((row) => [row.id, row.name]));
  const respondersById = new Map(responderRows.map((row) => [row.id, row]));

  const items = incidents.map((incident) => {
    const responder = incident.assignedResponderId
      ? respondersById.get(incident.assignedResponderId)
      : undefined;
    return {
      ...incident,
      incidentCategoryName: categoriesById.get(incident.incidentCategoryId) ?? "Unknown category",
      barangayName: incident.barangayId ? barangaysById.get(incident.barangayId) ?? null : null,
      reporterName: reportersById.get(incident.reporterUserId) ?? "Unknown reporter",
      assignedResponderName: responder?.name ?? null,
      assignedResponderTeam: responder?.teamName ?? null,
    };
  });

  return jsonOk({
    incidents: items,
    pagination: {
      total: totalRows[0]?.value ?? 0,
      limit: query.limit ?? null,
      offset: query.offset,
    },
  });
});

export const POST = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);

  if (!isAppRole(auth.user.role)) {
    throw new ApiError(403, "Invalid user role");
  }

  const body = await parseJson(request, createIncidentSchema);
  const result = await createIncidentReport({ reporterUserId: auth.user.id, body });

  await writeAuditLog({
    request,
    actorUserId: auth.user.id,
    action: result.duplicate ? "incident.create_duplicate" : "incident.create",
    entityType: "incident_report",
    entityId: result.incident.id,
    metadata: {
      severityLevel: result.incident.severityLevel,
      barangayId: result.incident.barangayId,
      clientReportId: result.incident.clientReportId,
      duplicate: result.duplicate,
    },
  });

  const response = { incident: result.incident, duplicate: result.duplicate };
  return result.duplicate ? jsonOk(response) : jsonCreated(response);
});