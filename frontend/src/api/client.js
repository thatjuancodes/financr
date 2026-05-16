const API_BASE = import.meta.env.VITE_API_BASE || "/api";
import { getActiveWorkspaceId, getAuthToken } from "./session";

export async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  const workspaceId = getActiveWorkspaceId();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await res.json().catch(() => null);
      if (body && typeof body.error === "string" && body.error.trim()) {
        throw new Error(body.error);
      }
    }
    const message = await res.text();
    throw new Error(message || "Request failed");
  }

  return res.json();
}
