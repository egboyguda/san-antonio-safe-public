"use client";

import { Ban, LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function UnauthorizedPage() {
  const router = useRouter();
  async function leave() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <main className="centered-page">
      <section className="access-card">
        <span className="brand-mark large"><ShieldCheck size={30} /></span>
        <span className="access-icon"><Ban size={25} /></span>
        <h1>Command center access required</h1>
        <p>
          Your account is signed in, but it does not have permission to use the
          command-center web application.
        </p>
        <button className="primary-button" onClick={leave}>
          <LogOut size={17} /> Sign in with another account
        </button>
      </section>
    </main>
  );
}
