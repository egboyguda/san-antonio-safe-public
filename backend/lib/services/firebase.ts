import type { App } from "firebase-admin/app";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type PushSendResult = {
  attempted: number;
  success: number;
  failure: number;
  skippedReason?: string;
};

function getFirebaseApp(): App | null {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!encoded) {
    return null;
  }

  const serviceAccount = JSON.parse(
    Buffer.from(encoded, "base64").toString("utf8"),
  ) as Record<string, string>;

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

function stringifyData(data: Record<string, unknown> | undefined): Record<string, string> {
  if (!data) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    ]),
  );
}

export async function sendPushToTokens(
  tokens: string[],
  payload: PushPayload,
): Promise<PushSendResult> {
  const uniqueTokens = Array.from(new Set(tokens)).filter(Boolean);
  if (uniqueTokens.length === 0) {
    return { attempted: 0, success: 0, failure: 0, skippedReason: "no_tokens" };
  }

  const app = getFirebaseApp();
  if (!app) {
    return {
      attempted: uniqueTokens.length,
      success: 0,
      failure: 0,
      skippedReason: "firebase_not_configured",
    };
  }

  const messaging = getMessaging(app);
  let success = 0;
  let failure = 0;

  for (let index = 0; index < uniqueTokens.length; index += 500) {
    const batch = uniqueTokens.slice(index, index + 500);
    const result = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: stringifyData(payload.data),
    });

    success += result.successCount;
    failure += result.failureCount;
  }

  return { attempted: uniqueTokens.length, success, failure };
}
