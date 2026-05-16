import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/feature/Navbar";
import Card from "@/components/base/Card";
import { LoadingState } from "@/components/feature/PageState";
import { api } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type WorkspaceMember = {
  user_id: string;
  email: string;
  name: string | null;
  role: string;
  joined_at: string;
};

type WorkspaceDetails = {
  id: string;
  name: string;
  type: string;
  members: WorkspaceMember[];
};

export default function HouseholdPage() {
  const { currentUser } = useAuth();
  const {
    activeWorkspace,
    activeWorkspaceId,
    createWorkspace,
    loading: workspaceLoading,
    refreshWorkspaces,
    switchWorkspace,
    workspaces,
  } = useWorkspace();
  const [details, setDetails] = useState<WorkspaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState("");
  const [submittingRename, setSubmittingRename] = useState(false);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      if (!activeWorkspaceId) {
        setDetails(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await api.getWorkspace(activeWorkspaceId);
        if (!cancelled) {
          setDetails(response || null);
          setRenameValue(response?.name || "");
        }
      } catch (_error) {
        if (!cancelled) {
          setDetails(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId]);

  const currentMembership = useMemo(() => {
    if (!details || !currentUser) {
      return null;
    }
    return (
      details.members.find((member) => member.user_id === currentUser.id) ||
      null
    );
  }, [currentUser, details]);

  const isOwner = currentMembership?.role === "owner" || activeWorkspace?.role === "owner";

  async function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspaceId) {
      return;
    }
    setSubmittingRename(true);
    setRenameError("");
    try {
      await api.updateWorkspace(activeWorkspaceId, { name: renameValue });
      await refreshWorkspaces();
      const response = await api.getWorkspace(activeWorkspaceId);
      setDetails(response || null);
      setRenameValue(response?.name || "");
    } catch (nextError: any) {
      setRenameError(nextError?.message || "Failed to rename space");
    } finally {
      setSubmittingRename(false);
    }
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspaceId) {
      return;
    }
    setSubmittingInvite(true);
    setInviteError("");
    setInviteLink("");
    try {
      const response = await api.createWorkspaceInvite(activeWorkspaceId, {
        email: inviteEmail,
      });
      const relativeLink = response?.invite_link || "";
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      setInviteLink(relativeLink ? `${origin}${relativeLink}` : "");
      setInviteEmail("");
      const refreshed = await api.getWorkspace(activeWorkspaceId);
      setDetails(refreshed || null);
    } catch (nextError: any) {
      setInviteError(nextError?.message || "Failed to create invite");
    } finally {
      setSubmittingInvite(false);
    }
  }

  async function handleCreateWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingCreate(true);
    setCreateError("");
    try {
      const workspace = await createWorkspace({ name: createName || "New Space" });
      if (workspace?.id) {
        setCreateName("");
        switchWorkspace(workspace.id);
      }
    } catch (nextError: any) {
      setCreateError(nextError?.message || "Failed to create space");
    } finally {
      setSubmittingCreate(false);
    }
  }

  if (workspaceLoading || loading) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <main className="px-4 pb-12 pt-20 md:px-8">
          <LoadingState label="Loading space settings..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="px-4 pb-12 pt-20 md:px-8">
        <section className="mb-6 grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
          <Card className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-text-muted">
              Space Settings
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text">
              {details?.name || "Space"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              Workspace is the storage model underneath the app. In the UI, this stays
              labeled as Space for the shared finance experience.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-text">
                  Active Space
                </span>
                <select
                  value={activeWorkspaceId}
                  onChange={(event) => switchWorkspace(event.target.value)}
                  className="w-full rounded-xl border border-bg-subtle px-4 py-3 text-sm outline-none transition focus:border-accent"
                >
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-xl bg-bg-subtle px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                  Your role
                </p>
                <p className="mt-2 text-lg font-semibold capitalize text-text">
                  {currentMembership?.role || activeWorkspace?.role || "member"}
                </p>
              </div>
            </div>

            {isOwner ? (
              <form className="mt-6 space-y-3" onSubmit={handleRename}>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-text">
                    Rename Space
                  </span>
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    className="w-full rounded-xl border border-bg-subtle px-4 py-3 text-sm outline-none transition focus:border-accent"
                    placeholder="My Space"
                    required
                  />
                </label>
                {renameError ? (
                  <div className="rounded-xl border border-negative/20 bg-negative-light px-4 py-3 text-sm text-negative-dark">
                    {renameError}
                  </div>
                ) : null}
                <button
                  type="submit"
                  disabled={submittingRename}
                  className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingRename ? "Saving..." : "Save Space Name"}
                </button>
              </form>
            ) : null}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-text">Create Another Space</h2>
            <p className="mt-2 text-sm text-text-secondary">
              This is optional, but you can create a separate Space and switch
              between them.
            </p>
            <form className="mt-6 space-y-3" onSubmit={handleCreateWorkspace}>
              <input
                type="text"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                className="w-full rounded-xl border border-bg-subtle px-4 py-3 text-sm outline-none transition focus:border-accent"
                placeholder="Travel Space"
              />
              {createError ? (
                <div className="rounded-xl border border-negative/20 bg-negative-light px-4 py-3 text-sm text-negative-dark">
                  {createError}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={submittingCreate}
                className="rounded-xl border border-bg-subtle px-5 py-3 text-sm font-semibold text-text transition hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingCreate ? "Creating..." : "Create Space"}
              </button>
            </form>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr,0.9fr]">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-text">Space Members</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Everyone listed here can access the entities and accounts in this Space.
            </p>
            <div className="mt-6 space-y-3">
              {(details?.members || []).map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-bg-subtle px-4 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-text">
                      {member.name || member.email}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">{member.email}</p>
                  </div>
                  <span className="rounded-full bg-accent-light px-3 py-1 text-xs font-semibold capitalize text-accent-dark">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-text">Invite to Space</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Create a local-alpha invite link for your spouse or another member.
            </p>
            {isOwner ? (
              <form className="mt-6 space-y-3" onSubmit={handleInvite}>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  className="w-full rounded-xl border border-bg-subtle px-4 py-3 text-sm outline-none transition focus:border-accent"
                  placeholder="spouse@example.com"
                  required
                />
                {inviteError ? (
                  <div className="rounded-xl border border-negative/20 bg-negative-light px-4 py-3 text-sm text-negative-dark">
                    {inviteError}
                  </div>
                ) : null}
                <button
                  type="submit"
                  disabled={submittingInvite}
                  className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingInvite ? "Generating..." : "Generate Invite Link"}
                </button>
              </form>
            ) : (
              <div className="mt-6 rounded-xl border border-bg-subtle bg-bg-subtle px-4 py-3 text-sm text-text-secondary">
                Only the Space owner can invite additional members.
              </div>
            )}

            {inviteLink ? (
              <div className="mt-6 rounded-xl border border-positive/20 bg-positive-light px-4 py-3">
                <p className="text-sm font-medium text-positive-dark">Invite link</p>
                <p className="mt-2 break-all text-sm text-positive-dark/90">{inviteLink}</p>
              </div>
            ) : null}
          </Card>
        </section>
      </main>
    </div>
  );
}
