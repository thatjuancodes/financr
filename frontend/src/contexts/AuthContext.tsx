import React from "react";
import { api } from "@/api";
import {
  clearSessionStorage,
  getAuthToken,
  setActiveWorkspaceId,
  setAuthToken,
} from "@/api/session";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
};

type AuthContextValue = {
  currentUser: AuthUser | null;
  loading: boolean;
  login: (payload: { email: string; password: string }) => Promise<any>;
  signup: (payload: { email: string; password: string; name?: string }) => Promise<any>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refreshCurrentUser = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await api.getMe();
      setCurrentUser(response?.user || null);
    } catch (_error) {
      clearSessionStorage();
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshCurrentUser();
  }, [refreshCurrentUser]);

  const login = React.useCallback(async (payload: { email: string; password: string }) => {
    const response = await api.login(payload);
    setAuthToken(response?.token || "");
    setActiveWorkspaceId(
      response?.activeWorkspace?.id || response?.workspaces?.[0]?.id || ""
    );
    setCurrentUser(response?.user || null);
    return response;
  }, []);

  const signup = React.useCallback(
    async (payload: { email: string; password: string; name?: string }) => {
      const response = await api.signup(payload);
      setAuthToken(response?.token || "");
      setActiveWorkspaceId(
        response?.activeWorkspace?.id || response?.workspaces?.[0]?.id || ""
      );
      setCurrentUser(response?.user || null);
      return response;
    },
    []
  );

  const logout = React.useCallback(async () => {
    try {
      await api.logout();
    } catch (_error) {
      // ignore logout transport errors and clear local state anyway
    } finally {
      clearSessionStorage();
      setCurrentUser(null);
    }
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      currentUser,
      loading,
      login,
      signup,
      logout,
      refreshCurrentUser,
    }),
    [currentUser, loading, login, signup, logout, refreshCurrentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
