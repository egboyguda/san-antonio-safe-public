import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { incidentReports, incidentStatusLogs } from "@/db/schema";
import { newId } from "@/lib/api/http";
import type { createIncidentSchema } from "@/lib/api/schemas";
import type { IncidentStatus } from "@/lib/domain/constants";
import { pointFromLatLng } from "@/lib/domain/geo";

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

type CreateIncidentReportInput = {
  reporterUserId: string;
  body: CreateIncidentInput;
};

export async function createIncidentReport(input: CreateIncidentReportInput) {
  return db.transaction(async (tx) => {
    if (input.body.clientReportId) {
      const [existing] = await tx
        .select()
        .from(incidentReports)
        .where(
          and(
            eq(incidentReports.reporterUserId, input.reporterUserId),
            eq(incidentReports.clientReportId, input.body.clientReportId),
          ),
        );

      if (existing) {
        return { incident: existing, duplicate: true };
      }
    }

    const incidentId = newId();
    const reportedAt = input.body.clientCreatedAt ?? new Date();

    const [created] = await tx
      .insert(incidentReports)
      .values({
        id: incidentId,
        reporterUserId: input.reporterUserId,
        incidentCategoryId: input.body.incidentCategoryId,
        title: input.body.title,
        description: input.body.description,
        clientReportId: input.body.clientReportId ?? null,
        clientCreatedAt: input.body.clientCreatedAt ?? null,
        latitude: input.body.latitude,
        longitude: input.body.longitude,
        location: pointFromLatLng(input.body.latitude, input.body.longitude),
        locationAccuracy: input.body.locationAccuracy ?? null,
        approximateAddress: input.body.approximateAddress ?? null,
        barangayId: input.body.barangayId ?? null,
        severityLevel: input.body.severityLevel,
        status: "pending" satisfies IncidentStatus,
        reportedAt,
      })
      .returning();

    await tx.insert(incidentStatusLogs).values({
      id: newId(),
      incidentReportId: incidentId,
      fromStatus: null,
      toStatus: "pending",
      remarks: input.body.clientReportId
        ? "Incident submitted from offline queue"
        : "Incident submitted",
      changedByUserId: input.reporterUserId,
    });

    return { incident: created, duplicate: false };
  });
}