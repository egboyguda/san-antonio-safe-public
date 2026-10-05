import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  barangays,
  emergencyContacts,
  evacuationCenters,
  incidentCategories,
} from "@/db/schema";
import { INCIDENT_STATUSES, SEVERITY_LEVELS } from "@/lib/domain/constants";
import { jsonOk, withApiErrorHandling } from "@/lib/api/http";

export const GET = withApiErrorHandling(async () => {
  const [barangayRows, categoryRows, contactRows, evacuationRows] = await Promise.all([
    db.select().from(barangays).orderBy(asc(barangays.name)),
    db
      .select()
      .from(incidentCategories)
      .where(eq(incidentCategories.isActive, true))
      .orderBy(asc(incidentCategories.name)),
    db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.isActive, true))
      .orderBy(asc(emergencyContacts.sortOrder), asc(emergencyContacts.name)),
    db
      .select()
      .from(evacuationCenters)
      .where(eq(evacuationCenters.isActive, true))
      .orderBy(asc(evacuationCenters.name)),
  ]);

  return jsonOk({
    barangays: barangayRows,
    incidentCategories: categoryRows,
    emergencyContacts: contactRows,
    evacuationCenters: evacuationRows,
    incidentStatuses: INCIDENT_STATUSES,
    severityLevels: SEVERITY_LEVELS,
  });
});
