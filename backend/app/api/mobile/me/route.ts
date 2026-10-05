import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user, userProfiles } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { jsonOk, newId, parseJson, withApiErrorHandling } from "@/lib/api/http";
import { profilePatchSchema } from "@/lib/api/schemas";

export const GET = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  const [row] = await db
    .select({ account: user, profile: userProfiles })
    .from(user)
    .leftJoin(userProfiles, eq(userProfiles.userId, user.id))
    .where(eq(user.id, auth.user.id));

  return jsonOk({ user: row?.account ?? auth.user, profile: row?.profile ?? null });
});

export const PATCH = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  const body = await parseJson(request, profilePatchSchema);

  if (body.name) {
    await db.update(user).set({ name: body.name }).where(eq(user.id, auth.user.id));
  }

  const profileUpdate: Partial<typeof userProfiles.$inferInsert> = {};
  if ("mobileNumber" in body) profileUpdate.mobileNumber = body.mobileNumber ?? null;
  if ("barangayId" in body) profileUpdate.barangayId = body.barangayId ?? null;
  if ("address" in body) profileUpdate.address = body.address ?? null;
  if ("emergencyContactName" in body) {
    profileUpdate.emergencyContactName = body.emergencyContactName ?? null;
  }
  if ("emergencyContactNumber" in body) {
    profileUpdate.emergencyContactNumber = body.emergencyContactNumber ?? null;
  }

  let profile = null;
  if (Object.keys(profileUpdate).length > 0) {
    [profile] = await db
      .insert(userProfiles)
      .values({ id: newId(), userId: auth.user.id, ...profileUpdate })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: profileUpdate,
      })
      .returning();
  } else {
    [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, auth.user.id));
  }

  await writeAuditLog({
    request,
    actorUserId: auth.user.id,
    action: "profile.update",
    entityType: "user_profile",
    entityId: profile?.id ?? auth.user.id,
  });

  return jsonOk({ profile });
});
