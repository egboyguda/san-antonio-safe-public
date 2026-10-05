import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { user, userProfiles } from "@/db/schema";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { jsonOk, withApiErrorHandling } from "@/lib/api/http";

export const GET = withApiErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  requireRole(auth, ["admin"]);

  const users = await db
    .select({ account: user, profile: userProfiles })
    .from(user)
    .leftJoin(userProfiles, eq(userProfiles.userId, user.id))
    .orderBy(asc(user.name));

  return jsonOk({ users });
});
