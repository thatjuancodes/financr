const AUTH_TOKEN_KEY = "financr-v1-auth-token";
const ACTIVE_WORKSPACE_ID_KEY = "financr-v1-active-workspace-id";

function readStorage(key) {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(key) || "";
}

function writeStorage(key, value) {
  if (typeof window === "undefined") {
    return;
  }
  if (!value) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, value);
}

export function getAuthToken() {
  return readStorage(AUTH_TOKEN_KEY);
}

export function setAuthToken(token) {
  writeStorage(AUTH_TOKEN_KEY, token ? String(token) : "");
}

export function getActiveWorkspaceId() {
  return readStorage(ACTIVE_WORKSPACE_ID_KEY);
}

export function setActiveWorkspaceId(workspaceId) {
  writeStorage(ACTIVE_WORKSPACE_ID_KEY, workspaceId ? String(workspaceId) : "");
}

export function clearSessionStorage() {
  writeStorage(AUTH_TOKEN_KEY, "");
  writeStorage(ACTIVE_WORKSPACE_ID_KEY, "");
}
