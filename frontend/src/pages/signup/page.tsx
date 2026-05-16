import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Card from "@/components/base/Card";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await signup({ name, email, password });
      navigate(searchParams.get("redirect") || (response?.activeWorkspace ? "/" : "/onboarding"), {
        replace: true,
      });
    } catch (nextError: any) {
      setError(nextError?.message || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  }

  const redirectSuffix = searchParams.get("redirect")
    ? `?redirect=${encodeURIComponent(searchParams.get("redirect") || "")}`
    : "";

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <section className="rounded-[2rem] bg-gradient-to-br from-primary-900 via-primary-700 to-primary-800 p-8 text-white shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
            Space Setup
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Create your account and start with a Space.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-white/80">
            Signup creates your first Space automatically and seeds a Personal
            entity so the current finance model keeps working.
          </p>
        </section>

        <Card className="p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-text">Create Account</h2>
          <p className="mt-2 text-sm text-text-secondary">
            This creates your login, a default Space, and an initial Personal entity.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">Name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-bg-subtle px-4 py-3 text-sm outline-none transition focus:border-accent"
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-bg-subtle px-4 py-3 text-sm outline-none transition focus:border-accent"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-bg-subtle px-4 py-3 text-sm outline-none transition focus:border-accent"
                placeholder="Create a password"
                autoComplete="new-password"
                required
              />
            </label>
            {error ? (
              <div className="rounded-xl border border-negative/20 bg-negative-light px-4 py-3 text-sm text-negative-dark">
                {error}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating account..." : "Create Account"}
            </button>
          </form>
          <p className="mt-6 text-sm text-text-secondary">
            Already have an account?{" "}
            <Link to={`/login${redirectSuffix}`} className="font-medium text-accent">
              Log in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
