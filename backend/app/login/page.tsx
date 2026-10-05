import { ShieldCheck, Siren } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-visual-inner">
          <div className="visual-brand"><ShieldCheck size={28} /> SanAntonioSafe</div>
          <div className="visual-copy">
            <span className="eyebrow light"><Siren size={16} /> Emergency Operations Platform</span>
            <h1>Clear information.<br />Faster response.</h1>
            <p>
              A single operational view for coordinating incidents, field
              responders, and public safety alerts across San Antonio.
            </p>
          </div>
          <div className="visual-status"><span /> Secure municipal system</div>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-login-brand"><ShieldCheck size={25} /> SanAntonioSafe</div>
          <span className="eyebrow">Command center access</span>
          <h2>Welcome back</h2>
          <p className="login-intro">Sign in with your authorized staff account to continue.</p>
          <LoginForm />
          <p className="login-help">
            Access is limited to command-center staff and system administrators.
          </p>
        </div>
      </section>
    </main>
  );
}
