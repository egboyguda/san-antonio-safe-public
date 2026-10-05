import { and, count, eq, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { incidentReports, responders } from "@/db/schema";

const TERMINAL_STATUSES = ["resolved", "archived", "rejected"];

export async function refreshResponderAvailability(
  responderIds: Array<string | null | undefined>,
) {
  const ids = [...new Set(responderIds.filter((id): id is string => Boolean(id)))];

  await Promise.all(
    ids.map(async (responderId) => {
      const [row] = await db
        .select({ value: count() })
        .from(incidentReports)
        .where(
          and(
            eq(incidentReports.assignedResponderId, responderId),
            notInArray(incidentReports.status, TERMINAL_STATUSES),
          ),
        );

      await db
        .update(responders)
        .set({ isAvailable: (row?.value ?? 0) === 0 })
        .where(eq(responders.id, responderId));
    }),
  );
}
