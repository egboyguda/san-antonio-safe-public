import { createHash } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { ApiError } from "@/lib/api/http";

export const LOCAL_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const MIME_EXTENSION: Record<(typeof LOCAL_PHOTO_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type LocalPhotoMimeType = (typeof LOCAL_PHOTO_MIME_TYPES)[number];

export type StoredIncidentPhoto = {
  storageKey: string;
  originalFilename: string | null;
  mimeType: LocalPhotoMimeType;
  bytes: number;
  sha256: string;
};

export function getMaxIncidentPhotoBytes(): number {
  const parsed = Number.parseInt(process.env.MAX_INCIDENT_PHOTO_BYTES ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5 * 1024 * 1024;
}

export function getLocalUploadDir(): string {
  const configured = process.env.LOCAL_UPLOAD_DIR?.trim();
  if (configured) {
    return resolve(configured);
  }

  return join(/* turbopackIgnore: true */ process.cwd(), "storage", "uploads", "incidents");
}

export function isAllowedPhotoMimeType(mimeType: string): mimeType is LocalPhotoMimeType {
  return LOCAL_PHOTO_MIME_TYPES.includes(mimeType as LocalPhotoMimeType);
}

export function validateLocalPhotoFile(input: {
  mimeType: string;
  bytes: number;
  maxBytes?: number;
}): { mimeType: LocalPhotoMimeType; bytes: number } {
  if (!isAllowedPhotoMimeType(input.mimeType)) {
    throw new ApiError(415, "Unsupported image type");
  }

  const maxBytes = input.maxBytes ?? getMaxIncidentPhotoBytes();
  if (!Number.isInteger(input.bytes) || input.bytes <= 0) {
    throw new ApiError(422, "Photo file is empty");
  }

  if (input.bytes > maxBytes) {
    throw new ApiError(413, "Photo file is too large", { maxBytes });
  }

  return { mimeType: input.mimeType, bytes: input.bytes };
}

export function validateLocalPhotoMetadata(input: {
  clientPhotoId?: string | null;
  mimeType: string;
  bytes: number;
  maxBytes?: number;
}): { clientPhotoId: string; mimeType: LocalPhotoMimeType; bytes: number } {
  const clientPhotoId = input.clientPhotoId?.trim();
  if (!clientPhotoId) {
    throw new ApiError(422, "clientPhotoId is required");
  }

  return { clientPhotoId, ...validateLocalPhotoFile(input) };
}

export function buildIncidentPhotoStorageKey(input: {
  incidentReportId: string;
  photoId: string;
  mimeType: LocalPhotoMimeType;
}): string {
  const extension = MIME_EXTENSION[input.mimeType];
  return `${input.incidentReportId}/${input.photoId}.${extension}`;
}

export function resolveIncidentPhotoPath(storageKey: string): string {
  const root = getLocalUploadDir();
  const resolved = resolve(/* turbopackIgnore: true */ root, storageKey);
  const rel = relative(root, resolved);

  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new ApiError(500, "Invalid local photo storage path");
  }

  return resolved;
}

export function getOriginalFilename(file: File): string | null {
  const name = typeof file.name === "string" ? file.name.trim() : "";
  if (!name) {
    return null;
  }

  const extension = extname(name);
  return extension ? `upload${extension.toLowerCase()}` : "upload";
}

export async function storeIncidentPhoto(input: {
  incidentReportId: string;
  photoId: string;
  file: File;
}): Promise<StoredIncidentPhoto> {
  const arrayBuffer = await input.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const validation = validateLocalPhotoFile({
    mimeType: input.file.type,
    bytes: buffer.byteLength,
  });
  const storageKey = buildIncidentPhotoStorageKey({
    incidentReportId: input.incidentReportId,
    photoId: input.photoId,
    mimeType: validation.mimeType,
  });
  const filePath = resolveIncidentPhotoPath(storageKey);

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer, { flag: "wx" });

  return {
    storageKey,
    originalFilename: getOriginalFilename(input.file),
    mimeType: validation.mimeType,
    bytes: validation.bytes,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

export async function statIncidentPhoto(storageKey: string) {
  return stat(resolveIncidentPhotoPath(storageKey));
}