import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user, userProfiles } from "@/db/schema";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { ApiError, jsonOk, newId, parseJson, withApiErrorHandling } from "@/lib/api/http";
import { adminUserPatchSchema } from "@/lib/api/schemas";

export const GET = withApiErrorHandling(
  async (request, context: { params: Promise<{ id: string }> }) => {
    const auth = await requireAuth(request);
    requireRole(auth, ["admin"]);
    const { id } = await context.params;

    const [row] = await db
      .select({ account: user, profile: userProfiles })
      .from(user)
      .leftJoin(userProfiles, eq(userProfiles.userId, user.id))
      .where(eq(user.id, id));

    if (!row) {
      throw new ApiError(404, "User not found");
    }

    return jsonOk(row);
  },
);

export const PATCH = withApiErrorHandling(
  async (request, context: { params: Promise<{ id: string }> }) => {
    const auth = await requireAuth(request);
    requireRole(auth, ["admin"]);
    const { id } = await context.params;
    const body = await parseJson(request, adminUserPatchSchema);

    const userUpdate: Partial<typeof user.$inferInsert> = {};
    if (body.role) userUpdate.role = body.role;
    if (body.banned !== undefined) userUpdate.banned = body.banned;
    if ("banReason" in body) userUpdate.banReason = body.banReason ?? null;
    if ("banExpires" in body) userUpdate.banExpires = body.banExpires ?? null;
    if (body.name) userUpdate.name = body.name;

    let updatedUser;
    if (Object.keys(userUpdate).length > 0) {
      [updatedUser] = await db
        .update(user)
        .set(userUpdate)
        .where(eq(user.id, id))
        .returning();
    } else {
      [updatedUser] = await db.select().from(user).where(eq(user.id, id));
    }

    if (!updatedUser) {
      throw new ApiError(404, "User not found");
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
        .values({ id: newId(), userId: id, ...profileUpdate })
        .onConflictDoUpdate({ target: userProfiles.userId, set: profileUpdate })
        .returning();
    } else {
      [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, id));
    }

    await writeAuditLog({
      request,
      actorUserId: auth.user.id,
      action: "admin.user.update",
      entityType: "user",
      entityId: id,
      metadata: { role: body.role, banned: body.banned },
    });

    return jsonOk({ user: updatedUser, profile });
  },
);
