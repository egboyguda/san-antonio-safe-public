import { auth } from "@/lib/auth";
import { type AppRole, normalizeRole } from "@/lib/domain/constants";
import { ApiError } from "./http";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  banned?: boolean;
};

export type AuthContext = {
  user: AuthUser;
  session: {
    id: string;
    token: string;
    userId: string;
  };
};

type BetterAuthUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
};

type BetterAuthSession = {
  id: string;
  token: string;
  userId: string;
};

export async function requireAuth(request: Request): Promise<AuthContext> {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    throw new ApiError(401, "Authentication required");
  }

  const rawUser = session.user as BetterAuthUser;
  if (rawUser.banned) {
    throw new ApiError(403, "User account is banned");
  }

  return {
    user: {
      id: rawUser.id,
      name: rawUser.name,
      email: rawUser.email,
      role: normalizeRole(rawUser.role),
      banned: Boolean(rawUser.banned),
    },
    session: session.session as BetterAuthSession,
  };
}

export function requireRole(context: AuthContext, roles: readonly AppRole[]): void {
  if (!roles.includes(context.user.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }
}

export function canManageIncidents(role: AppRole): boolean {
  return ["barangay_officer", "command_center_staff", "admin"].includes(role);
}

export function canManageSystem(role: AppRole): boolean {
  return role === "admin";
}
