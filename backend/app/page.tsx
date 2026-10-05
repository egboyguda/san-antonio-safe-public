import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { normalizeRole } from "@/lib/domain/constants";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const role = normalizeRole(session.user.role);
  if (["command_center_staff", "admin"].includes(role)) redirect("/dashboard");
  redirect("/unauthorized");
}