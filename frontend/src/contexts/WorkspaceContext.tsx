import React from "react";
import { api } from "@/api";
import {
  getActiveWorkspaceId,
  setActiveWorkspaceId,
} from "@/api/session";
import { useAuth } from "@/contexts/AuthContext";

export type WorkspaceRecord = {
  id: string;
  name: string;
  type: string;
  role?: string | null;
};

type WorkspaceContextValue = {
  workspaces: WorkspaceRecord[];
  activeWorkspace: WorkspaceRecord | null;
  activeWorkspaceId: string;
  loading: boolean;
  switchWorkspace: (workspaceId: string) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (payload: { name: string }) => Promise<WorkspaceRecord | null>;
};

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, loading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = React.useState<WorkspaceRecord[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = React.useState(() =>
    getActiveWorkspaceId()
  );
  const [loading, setLoading] = React.useState(true);

  const refreshWorkspaces = React.useCallback(async () => {
    if (!currentUser) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const nextWorkspaces = await api.getWorkspaces();
      const rows = Array.isArray(nextWorkspaces) ? nextWorkspaces : [];
      setWorkspaces(rows);
      const storedId = getActiveWorkspaceId();
      const resolvedActiveWorkspace =
        rows.find((workspace) => workspace.id === activeWorkspaceId) ||
        rows.find((workspace) => workspace.id === storedId) ||
        rows[0] ||
        null;
      const nextWorkspaceId = resolvedActiveWorkspace?.id || "";
      setActiveWorkspaceId(nextWorkspaceId);
      setActiveWorkspaceIdState(nextWorkspaceId);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, currentUser]);

  React.useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!currentUser) {
      setWorkspaces([]);
      setActiveWorkspaceId("");
      setActiveWorkspaceIdState("");
      setLoading(false);
      return;
    }
    void refreshWorkspaces();
  }, [authLoading, currentUser, refreshWorkspaces]);

  const switchWorkspace = React.useCallback((workspaceId: string) => {
    const nextWorkspaceId = workspaceId || "";
    setActiveWorkspaceId(nextWorkspaceId);
    setActiveWorkspaceIdState(nextWorkspaceId);
  }, []);

  const createWorkspace = React.useCallback(
    async (payload: { name: string }) => {
      const workspace = await api.createWorkspace(payload);
      await refreshWorkspaces();
      if (workspace?.id) {
        switchWorkspace(workspace.id);
      }
      return workspace || null;
    },
    [refreshWorkspaces, switchWorkspace]
  );

  const activeWorkspace = React.useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) || null,
    [activeWorkspaceId, workspaces]
  );

  const value = React.useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      activeWorkspace,
      activeWorkspaceId,
      loading,
      switchWorkspace,
      refreshWorkspaces,
      createWorkspace,
    }),
    [
      workspaces,
      activeWorkspace,
      activeWorkspaceId,
      loading,
      switchWorkspace,
      refreshWorkspaces,
      createWorkspace,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = React.useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}
