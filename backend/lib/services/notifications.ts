import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { deviceTokens, notifications } from "@/db/schema";
import type { NotificationType } from "@/lib/domain/constants";
import { newId } from "@/lib/api/http";
import { sendPushToTokens, type PushSendResult } from "./firebase";

export type NotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export async function createNotificationsForUsers(
  userIds: string[],
  input: NotificationInput,
): Promise<{ notificationIds: string[]; push: PushSendResult }> {
  const uniqueUserIds = Array.from(new Set(userIds)).filter(Boolean);
  if (uniqueUserIds.length === 0) {
    return {
      notificationIds: [],
      push: { attempted: 0, success: 0, failure: 0, skippedReason: "no_users" },
    };
  }

  const rows = uniqueUserIds.map((userId) => ({
    id: newId(),
    userId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data ?? {},
  }));

  const inserted = await db.insert(notifications).values(rows).returning({
    id: notifications.id,
    userId: notifications.userId,
  });

  const tokens = await db
    .select({ token: deviceTokens.token })
    .from(deviceTokens)
    .where(inArray(deviceTokens.userId, uniqueUserIds));

  const push = await sendPushToTokens(
    tokens.map((row) => row.token),
    {
      title: input.title,
      body: input.body,
      data: input.data,
    },
  );

  return {
    notificationIds: inserted.map((row) => row.id),
    push,
  };
}
