import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { auth } from "@/lib/auth";
import { normalizeRole } from "@/lib/domain/constants";

export default async function CommandCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const role = normalizeRole(session.user.role);
  if (!["command_center_staff", "admin"].includes(role)) {
    redirect("/unauthorized");
  }

  return (
    <DashboardShell
      user={{
        name: session.user.name,
        email: session.user.email,
        role,
      }}
    >
      {children}
    </DashboardShell>
  );
}
