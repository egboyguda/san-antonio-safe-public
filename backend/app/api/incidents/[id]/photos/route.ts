import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { incidentPhotos } from "@/db/schema";
import { writeAuditLog } from "@/lib/api/audit";
import {
  ApiError,
  jsonCreated,
  jsonOk,
  newId,
  withApiErrorHandling,
} from "@/lib/api/http";
import { localPhotoUploadFieldsSchema } from "@/lib/api/schemas";
import {
  assertCanAttachIncidentPhoto,
  getIncidentOrThrow,
} from "@/lib/services/incident-access";
import { storeIncidentPhoto, validateLocalPhotoMetadata } from "@/lib/services/local-photos";

export const runtime = "nodejs";

function photoWithDownloadUrl(photo: typeof incidentPhotos.$inferSelect) {
  return {
    ...photo,
    downloadUrl: `/api/incidents/${photo.incidentReportId}/photos/${photo.id}`,
  };
}

async function parseMultipartPhotoRequest(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    throw new ApiError(400, "Request body must be multipart/form-data");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new ApiError(422, "file is required");
  }

  const fields = localPhotoUploadFieldsSchema.parse({
    clientPhotoId: formData.get("clientPhotoId"),
  });

  validateLocalPhotoMetadata({
    clientPhotoId: fields.clientPhotoId,
    mimeType: file.type,
    bytes: file.size,
  });

  return { file, clientPhotoId: fields.clientPhotoId };
}

export const POST = withApiErrorHandling(
  async (request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const incident = await getIncidentOrThrow(id);
    const auth = await assertCanAttachIncidentPhoto(request, incident);
    const { file, clientPhotoId } = await parseMultipartPhotoRequest(request);

    const [existing] = await db
      .select()
      .from(incidentPhotos)
      .where(
        and(
          eq(incidentPhotos.incidentReportId, id),
          eq(incidentPhotos.clientPhotoId, clientPhotoId),
        ),
      );

    if (existing) {
      return jsonOk({ photo: photoWithDownloadUrl(existing), duplicate: true });
    }

    const photoId = newId();
    const stored = await storeIncidentPhoto({ incidentReportId: id, photoId, file });

    const [photo] = await db
      .insert(incidentPhotos)
      .values({
        id: photoId,
        incidentReportId: id,
        clientPhotoId,
        storageKey: stored.storageKey,
        originalFilename: stored.originalFilename,
        mimeType: stored.mimeType,
        bytes: stored.bytes,
        sha256: stored.sha256,
        width: null,
        height: null,
        uploadedByUserId: auth.user.id,
      })
      .returning();

    await writeAuditLog({
      request,
      actorUserId: auth.user.id,
      action: "incident.photos.upload_local",
      entityType: "incident_photo",
      entityId: photo.id,
      metadata: { incidentReportId: id, clientPhotoId, bytes: photo.bytes },
    });

    return jsonCreated({ photo: photoWithDownloadUrl(photo), duplicate: false });
  },
);