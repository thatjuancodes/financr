import { Navigate, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { LoadingState } from "@/components/feature/PageState";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import NotFound from "@/pages/NotFound";

const STYLEGUIDE_ALLOWED_EMAIL = "jmagaudielalvarez@gmail.com";

function normalizeEmail(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function FullScreenLoading({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-bg px-4 py-12">
      <div className="mx-auto max-w-xl">
        <LoadingState label={label} />
      </div>
    </div>
  );
}

function buildRedirectTarget(location: ReturnType<typeof useLocation>) {
  return `${location.pathname}${location.search}${location.hash}`;
}

export function RequireAuth() {
  const location = useLocation();
  const { currentUser, loading: authLoading } = useAuth();
  const { activeWorkspaceId, loading: workspaceLoading } = useWorkspace();

  if (authLoading || workspaceLoading) {
    return <FullScreenLoading label="Loading your space..." />;
  }

  if (!currentUser) {
    const redirect = encodeURIComponent(buildRedirectTarget(location));
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (!activeWorkspaceId) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

export function RequireGuest() {
  const { currentUser, loading: authLoading } = useAuth();
  const { activeWorkspaceId, loading: workspaceLoading } = useWorkspace();
  const [searchParams] = useSearchParams();

  if (authLoading || workspaceLoading) {
    return <FullScreenLoading label="Checking your session..." />;
  }

  if (!currentUser) {
    return <Outlet />;
  }

  const redirectTarget = searchParams.get("redirect") || "/";
  return <Navigate to={activeWorkspaceId ? redirectTarget : "/onboarding"} replace />;
}

export function RequireOnboarding() {
  const location = useLocation();
  const { currentUser, loading: authLoading } = useAuth();
  const { activeWorkspaceId, loading: workspaceLoading } = useWorkspace();

  if (authLoading || workspaceLoading) {
    return <FullScreenLoading label="Preparing your space..." />;
  }

  if (!currentUser) {
    const redirect = encodeURIComponent(buildRedirectTarget(location));
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (activeWorkspaceId) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function RequireStyleguideAccess() {
  const { currentUser } = useAuth();

  if (normalizeEmail(currentUser?.email) !== STYLEGUIDE_ALLOWED_EMAIL) {
    return <NotFound />;
  }

  return <Outlet />;
}
