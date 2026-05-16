import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@/components/base/Card";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { createWorkspace, loading } = useWorkspace();
  const [name, setName] = useState("My Space");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const workspace = await createWorkspace({ name });
      navigate(workspace?.id ? "/" : "/household", { replace: true });
    } catch (nextError: any) {
      setError(nextError?.message || "Failed to create space");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary-900 via-primary-700 to-primary-800 px-6 py-8 text-white sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
              Onboarding
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Create your Space
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
              This is the minimal private-alpha setup. Create a Space, then you can
              invite your spouse from Space Settings.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <ol className="grid gap-3 text-sm text-text-secondary sm:grid-cols-4">
              <li className="rounded-xl bg-bg-subtle px-4 py-3 text-text">1. Account created</li>
              <li className="rounded-xl bg-accent-light px-4 py-3 font-medium text-accent-dark">
                2. Create Space
              </li>
              <li className="rounded-xl bg-bg-subtle px-4 py-3">
                3. Invite spouse later
              </li>
              <li className="rounded-xl bg-bg-subtle px-4 py-3">4. Go to dashboard</li>
            </ol>

            <form className="mt-6 space-y-4" onSubmit={handleCreate}>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-text">
                  Space name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-bg-subtle px-4 py-3 text-sm outline-none transition focus:border-accent"
                  placeholder="My Space"
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
                disabled={loading || submitting}
                className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating Space..." : "Create Space"}
              </button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
