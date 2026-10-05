"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      setError(result.error.message ?? "Email or password is incorrect.");
      setLoading(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <div className="field-group">
        <label htmlFor="email">Work email</label>
        <div className="input-with-icon">
          <Mail size={18} />
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@sanantonio.gov.ph"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
      </div>
      <div className="field-group">
        <div className="field-label-row">
          <label htmlFor="password">Password</label>
          <span>Authorized personnel only</span>
        </div>
        <div className="input-with-icon">
          <LockKeyhole size={18} />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="primary-button login-button" disabled={loading}>
        {loading ? <LoaderCircle className="spin" size={18} /> : null}
        {loading ? "Signing in?" : "Sign in to command center"}
      </button>
    </form>
  );
}
