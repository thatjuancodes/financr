import { apiFetch } from "./client";

export function fetchProjectionScenarios(params = {}) {
  const query = new URLSearchParams();
  if (params.workspace_id) {
    query.set("workspace_id", String(params.workspace_id));
  }
  if (params.entity_id) {
    query.set("entity_id", String(params.entity_id));
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/projection-scenarios${suffix}`);
}

export function fetchProjectionScenario(id) {
  return apiFetch(`/projection-scenarios/${encodeURIComponent(String(id))}`);
}

export function previewProjectionScenario(payload) {
  return apiFetch("/projection-scenarios/preview", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createProjectionScenario(payload) {
  return apiFetch("/projection-scenarios", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProjectionScenario(id, payload) {
  return apiFetch(`/projection-scenarios/${encodeURIComponent(String(id))}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteProjectionScenario(id) {
  return apiFetch(`/projection-scenarios/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  });
}

export function duplicateProjectionScenario(id) {
  return apiFetch(
    `/projection-scenarios/${encodeURIComponent(String(id))}/duplicate`,
    {
      method: "POST",
    }
  );
}
