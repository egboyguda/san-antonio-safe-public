import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { incidentPhotos } from "@/db/schema";
import { ApiError, withApiErrorHandling } from "@/lib/api/http";
import { assertCanReadIncident, getIncidentOrThrow } from "@/lib/services/incident-access";
import { resolveIncidentPhotoPath, statIncidentPhoto } from "@/lib/services/local-photos";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(
  async (request, context: { params: Promise<{ id: string; photoId: string }> }) => {
    const { id, photoId } = await context.params;
    const incident = await getIncidentOrThrow(id);
    await assertCanReadIncident(request, incident);

    const [photo] = await db
      .select()
      .from(incidentPhotos)
      .where(and(eq(incidentPhotos.id, photoId), eq(incidentPhotos.incidentReportId, id)));

    if (!photo) {
      throw new ApiError(404, "Photo not found");
    }

    let fileStat;
    try {
      fileStat = await statIncidentPhoto(photo.storageKey);
    } catch {
      throw new ApiError(404, "Photo file not found");
    }

    const stream = Readable.toWeb(createReadStream(resolveIncidentPhotoPath(photo.storageKey)));
    const headers = new Headers({
      "Content-Type": photo.mimeType,
      "Content-Length": String(fileStat.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });

    if (photo.originalFilename) {
      headers.set("Content-Disposition", `inline; filename="${photo.originalFilename}"`);
    }

    return new Response(stream as unknown as BodyInit, { headers });
  },
);