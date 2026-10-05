import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api/http";
import {
  createIncidentSchema,
  incidentListQuerySchema,
  responderListQuerySchema,
  syncPushSchema,
} from "../lib/api/schemas";
import { normalizeRole } from "../lib/domain/constants";
import {
  allowedNextIncidentStatuses,
  canTransitionIncidentStatus,
} from "../lib/domain/incident-status";
import { formatDuration, NEXT_STATUSES } from "../lib/dashboard/format";
import { sendPushToTokens } from "../lib/services/firebase";
import { getDiscoveryInfo } from "../lib/discovery";
// @ts-expect-error Runtime ESM helper intentionally has no generated declaration.
import { isLanDiscoveryEnabled, stopLanServices } from "../scripts/lan-server-utils.mjs";
import {
  buildIncidentPhotoStorageKey,
  resolveIncidentPhotoPath,
  validateLocalPhotoMetadata,
} from "../lib/services/local-photos";

describe("incident status workflow", () => {
  it("allows the documented happy path", () => {
    expect(canTransitionIncidentStatus("pending", "verified")).toBe(true);
    expect(canTransitionIncidentStatus("verified", "assigned")).toBe(true);
    expect(canTransitionIncidentStatus("assigned", "responding")).toBe(true);
    expect(canTransitionIncidentStatus("responding", "resolved")).toBe(true);
    expect(canTransitionIncidentStatus("resolved", "archived")).toBe(true);
  });

  it("rejects backwards status movement", () => {
    expect(canTransitionIncidentStatus("resolved", "responding")).toBe(false);
    expect(allowedNextIncidentStatuses("archived")).toEqual([]);
  });
});

describe("validation", () => {
  it("accepts a valid offline incident payload without photo metadata", () => {
    const parsed = createIncidentSchema.parse({
      incidentCategoryId: "fire",
      title: "House fire",
      description: "Smoke seen near the road",
      latitude: 12.412,
      longitude: 124.279,
      severityLevel: "critical",
      clientReportId: "local-report-1",
      clientCreatedAt: "2026-07-04T02:00:00.000Z",
    });

    expect(parsed.clientReportId).toBe("local-report-1");
    expect(parsed.clientCreatedAt).toBeInstanceOf(Date);
  });

  it("accepts an Android offline sync batch", () => {
    const parsed = syncPushSchema.parse({
      clientBatchId: "batch-1",
      deviceId: "android-device-1",
      operations: [
        {
          clientOperationId: "op-1",
          type: "create_incident",
          payload: {
            clientReportId: "local-report-2",
            clientCreatedAt: "2026-07-04T03:00:00.000Z",
            incidentCategoryId: "medical",
            title: "Medical assistance",
            description: "Resident needs help",
            latitude: 12.412,
            longitude: 124.279,
          },
        },
      ],
    });

    expect(parsed.operations[0].type).toBe("create_incident");
    expect(parsed.operations[0].clientOperationId).toBe("op-1");
  });

  it("rejects invalid coordinates", () => {
    expect(() =>
      createIncidentSchema.parse({
        incidentCategoryId: "fire",
        title: "Bad location",
        description: "Invalid coordinate",
        latitude: 500,
        longitude: 124.279,
      }),
    ).toThrow();
  });
});

describe("command center query validation", () => {
  it("coerces safe incident pagination and rejects oversized pages", () => {
    const parsed = incidentListQuerySchema.parse({ limit: "20", offset: "40" });
    expect(parsed).toMatchObject({ limit: 20, offset: 40 });
    expect(() => incidentListQuerySchema.parse({ limit: "101" })).toThrow();
  });

  it("validates responder availability filters", () => {
    expect(responderListQuerySchema.parse({ available: "true" })).toEqual({
      available: "true",
    });
    expect(() => responderListQuerySchema.parse({ available: "yes" })).toThrow();
  });

  it("keeps dashboard actions aligned with backend transitions", () => {
    expect(NEXT_STATUSES.pending).toEqual(allowedNextIncidentStatuses("pending"));
    expect(NEXT_STATUSES.responding).toEqual(
      allowedNextIncidentStatuses("responding"),
    );
    expect(formatDuration(3660)).toBe("1h 1m");
  });
});
describe("local incident photos", () => {
  it("validates supported MIME type, size, and client photo id", () => {
    const parsed = validateLocalPhotoMetadata({
      clientPhotoId: "local-photo-1",
      mimeType: "image/jpeg",
      bytes: 1024,
      maxBytes: 2048,
    });

    expect(parsed).toMatchObject({
      clientPhotoId: "local-photo-1",
      mimeType: "image/jpeg",
      bytes: 1024,
    });
  });

  it("rejects invalid local photo input", () => {
    expect(() =>
      validateLocalPhotoMetadata({ clientPhotoId: "", mimeType: "image/jpeg", bytes: 1 }),
    ).toThrow(ApiError);
    expect(() =>
      validateLocalPhotoMetadata({ clientPhotoId: "p1", mimeType: "image/gif", bytes: 1 }),
    ).toThrow(ApiError);
    expect(() =>
      validateLocalPhotoMetadata({ clientPhotoId: "p1", mimeType: "image/png", bytes: 10, maxBytes: 5 }),
    ).toThrow(ApiError);
  });

  it("generates server-owned storage keys and blocks traversal", () => {
    vi.stubEnv("LOCAL_UPLOAD_DIR", "C:\\tmp\\san-antonio-safe-test-uploads");

    expect(
      buildIncidentPhotoStorageKey({
        incidentReportId: "incident-1",
        photoId: "photo-1",
        mimeType: "image/webp",
      }),
    ).toBe("incident-1/photo-1.webp");
    expect(() => resolveIncidentPhotoPath("../escape.jpg")).toThrow(ApiError);
  });
});

describe("roles", () => {
  it("normalizes unknown roles to resident", () => {
    expect(normalizeRole("admin")).toBe("admin");
    expect(normalizeRole("unknown")).toBe("resident");
    expect(normalizeRole(null)).toBe("resident");
  });
});

describe("FCM service", () => {
  it("skips sending when Firebase credentials are not configured", async () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64", "");

    const result = await sendPushToTokens(["token-1"], {
      title: "Alert",
      body: "Message",
    });

    expect(result).toMatchObject({
      attempted: 1,
      success: 0,
      failure: 0,
      skippedReason: "firebase_not_configured",
    });
  });
});
describe("LAN discovery", () => {
  it("returns a stable, non-sensitive API identity", () => {
    vi.stubEnv("LAN_DISCOVERY_INSTANCE_ID", "command-center-1");
    vi.stubEnv("LAN_DISCOVERY_NAME", "Municipal Command Center");
    vi.stubEnv("LAN_DISCOVERY_SCHEME", "https");
    vi.stubEnv("PORT", "3443");

    const info = getDiscoveryInfo(new Date("2026-07-17T05:00:00.000Z"));

    expect(info).toEqual({
      service: "sanantoniosafe-api",
      apiVersion: 1,
      instanceId: "command-center-1",
      name: "Municipal Command Center",
      scheme: "https",
      port: 3443,
      apiBasePath: "/",
      serverTime: "2026-07-17T05:00:00.000Z",
    });
    expect(JSON.stringify(info)).not.toContain("DATABASE_URL");
    vi.unstubAllEnvs();
  });

  it("falls back to safe LAN defaults for invalid configuration", () => {
    vi.stubEnv("PORT", "invalid");
    vi.stubEnv("LAN_DISCOVERY_SCHEME", "ftp");
    expect(getDiscoveryInfo()).toMatchObject({
      instanceId: "sanantoniosafe-local",
      scheme: "http",
      port: 3000,
    });
    vi.unstubAllEnvs();
  });
});

describe("LAN server runtime", () => {
  it("honors disabled discovery values", () => {
    expect(isLanDiscoveryEnabled("true")).toBe(true);
    expect(isLanDiscoveryEnabled("false")).toBe(false);
    expect(isLanDiscoveryEnabled("0")).toBe(false);
    expect(isLanDiscoveryEnabled("off")).toBe(false);
  });

  it("withdraws the service, shuts down ciao, and stops Next", async () => {
    const calls: string[] = [];
    const service = { end: vi.fn(async () => { calls.push("service"); }) };
    const responder = { shutdown: vi.fn(async () => { calls.push("responder"); }) };
    const child = { killed: false, kill: vi.fn(() => { calls.push("child"); return true; }) };

    await stopLanServices({ service, responder, child });

    expect(calls).toEqual(["service", "responder", "child"]);
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  });
});