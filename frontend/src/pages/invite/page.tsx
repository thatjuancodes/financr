import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/api";
import Card from "@/components/base/Card";
import { LoadingState } from "@/components/feature/PageState";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type InviteRecord = {
  id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_type: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  invited_by: {
    user_id: string;
    email: string;
    name: string | null;
  };
};

export default function InvitePage() {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const { currentUser, logout } = useAuth();
  const { refreshWorkspaces, switchWorkspace } = useWorkspace();
  const [invite, setInvite] = useState<InviteRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [acceptedWorkspaceName, setAcceptedWorkspaceName] = useState("");
  const autoAcceptStarted = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInvite() {
      setLoading(true);
      setError("");
      try {
        const response = await api.getInvite(token);
        if (!cancelled) {
          setInvite(response?.invite || null);
        }
      } catch (nextError: any) {
        if (!cancelled) {
          setError(nextError?.message || "Failed to load invite");
          setInvite(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (token) {
      void loadInvite();
    } else {
      setLoading(false);
      setError("Invalid invite link");
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  const emailMatchesInvite = useMemo(() => {
    if (!invite || !currentUser?.email) {
      return false;
    }
    return currentUser.email.trim().toLowerCase() === invite.email.trim().toLowerCase();
  }, [currentUser?.email, invite]);

  async function acceptInvite() {
    if (!invite || !token) {
      return;
    }
    setAccepting(true);
    setError("");
    try {
      const response = await api.acceptInvite(token);
      const workspaceId = response?.workspace?.id || invite.workspace_id;
      const workspaceName = response?.workspace?.name || invite.workspace_name;
      await refreshWorkspaces();
      if (workspaceId) {
        switchWorkspace(workspaceId);
      }
      setAcceptedWorkspaceName(workspaceName);
      window.setTimeout(() => {
        navigate("/", { replace: true });
      }, 900);
    } catch (nextError: any) {
      setError(nextError?.message || "Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  }

  useEffect(() => {
    if (!invite || !currentUser || !emailMatchesInvite || autoAcceptStarted.current) {
      return;
    }
    autoAcceptStarted.current = true;
    void acceptInvite();
  }, [currentUser, emailMatchesInvite, invite]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <LoadingState label="Loading invite..." />
        </div>
      </div>
    );
  }

  const invitePath = `/invite/${encodeURIComponent(token)}`;

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Card className="p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-text-muted">
            Space Invite
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text">
            Join {invite?.workspace_name || "Space"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {invite?.invited_by?.name || invite?.invited_by?.email || "A space owner"} invited{" "}
            {invite?.email || "you"} as a {invite?.role || "member"}.
          </p>

          {error ? (
            <div className="mt-6 rounded-xl border border-negative/20 bg-negative-light px-4 py-3 text-sm text-negative-dark">
              {error}
            </div>
          ) : null}

          {acceptedWorkspaceName ? (
            <div className="mt-6 rounded-xl border border-positive/20 bg-positive-light px-4 py-3 text-sm text-positive-dark">
              Joined {acceptedWorkspaceName}. Redirecting to your dashboard...
            </div>
          ) : null}

          {!currentUser ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-text-secondary">
                Sign up or log in with <strong>{invite?.email}</strong> to accept this
                Space invite.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to={`/signup?redirect=${encodeURIComponent(invitePath)}`}
                  className="rounded-xl bg-accent px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-accent-dark"
                >
                  Create account
                </Link>
                <Link
                  to={`/login?redirect=${encodeURIComponent(invitePath)}`}
                  className="rounded-xl border border-bg-subtle px-5 py-3 text-center text-sm font-semibold text-text transition hover:bg-bg-subtle"
                >
                  Log in
                </Link>
              </div>
            </div>
          ) : emailMatchesInvite ? (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => void acceptInvite()}
                disabled={accepting || Boolean(acceptedWorkspaceName)}
                className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {accepting ? "Joining Space..." : "Accept Invite"}
              </button>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-warning/20 bg-warning-light px-4 py-3 text-sm text-warning-dark">
              You are logged in as <strong>{currentUser.email}</strong>, but this invite is for{" "}
              <strong>{invite?.email}</strong>.
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-warning-dark transition hover:bg-white/80"
                >
                  Log out and use a different account
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
