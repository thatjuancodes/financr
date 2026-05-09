import React from "react";
import {
  createProjectionScenario,
  deleteProjectionScenario,
  duplicateProjectionScenario,
  fetchProjectionScenario,
  fetchProjectionScenarios,
  previewProjectionScenario,
  updateProjectionScenario,
} from "../../api/projections.api";
import { buildProjectionScenarioSummary } from "../../utils/projections";
import { sortProjectionScenarios } from "./projections.utils";

export function useProjections({ workspaceId, activeEntityFilterId }) {
  const [scenarios, setScenarios] = React.useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = React.useState("");
  const [selectedScenario, setSelectedScenario] = React.useState(null);
  const [selectedScenarioResult, setSelectedScenarioResult] = React.useState(null);
  const [previewResult, setPreviewResult] = React.useState(null);
  const [isListLoading, setIsListLoading] = React.useState(true);
  const [isScenarioLoading, setIsScenarioLoading] = React.useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [duplicatingScenarioId, setDuplicatingScenarioId] = React.useState("");
  const [deletingScenarioId, setDeletingScenarioId] = React.useState("");
  const [error, setError] = React.useState("");
  const [previewError, setPreviewError] = React.useState("");
  const activeRequestIdRef = React.useRef(0);
  const previewRequestIdRef = React.useRef(0);
  const selectedScenarioIdRef = React.useRef("");

  React.useEffect(() => {
    selectedScenarioIdRef.current = selectedScenarioId;
  }, [selectedScenarioId]);

  const clearSelection = React.useCallback(() => {
    setSelectedScenarioId("");
    setSelectedScenario(null);
    setSelectedScenarioResult(null);
    setPreviewResult(null);
    setPreviewError("");
    setIsPreviewLoading(false);
  }, []);

  const syncPreviewResult = React.useCallback((result) => {
    setPreviewResult(result);
    setPreviewError("");
    setIsPreviewLoading(false);
  }, []);

  const clearPreviewState = React.useCallback(() => {
    setPreviewError("");
    setIsPreviewLoading(false);
  }, []);

  const loadScenario = React.useCallback(
    async (scenarioId) => {
      if (!scenarioId) {
        clearSelection();
        return null;
      }

      const requestId = activeRequestIdRef.current + 1;
      activeRequestIdRef.current = requestId;
      setIsScenarioLoading(true);
      setError("");

      try {
        const response = await fetchProjectionScenario(scenarioId);
        if (activeRequestIdRef.current !== requestId) {
          return null;
        }
        setSelectedScenarioId(response.scenario.id);
        setSelectedScenario(response.scenario);
        setSelectedScenarioResult(response.result);
        syncPreviewResult(response.result);
        return response;
      } catch (err) {
        if (activeRequestIdRef.current === requestId) {
          setError(err.message || "Failed to load projection scenario");
        }
        return null;
      } finally {
        if (activeRequestIdRef.current === requestId) {
          setIsScenarioLoading(false);
        }
      }
    },
    [clearSelection, syncPreviewResult]
  );

  const loadScenarios = React.useCallback(async () => {
    setIsListLoading(true);
    setError("");
    try {
      const rows = await fetchProjectionScenarios({
        workspace_id: workspaceId,
        entity_id: activeEntityFilterId,
      });
      setScenarios(rows);
      const preferredScenarioId = selectedScenarioIdRef.current;
      const nextScenarioId =
        rows.find((item) => item.id === preferredScenarioId)?.id || rows[0]?.id || "";
      if (nextScenarioId) {
        await loadScenario(nextScenarioId);
      } else {
        clearSelection();
      }
      return rows;
    } catch (err) {
      setError(err.message || "Failed to load projections");
      clearSelection();
      return [];
    } finally {
      setIsListLoading(false);
    }
  }, [activeEntityFilterId, clearSelection, loadScenario, workspaceId]);

  React.useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  const createScenarioRecord = React.useCallback(
    async (payload) => {
      setIsCreating(true);
      setError("");
      try {
        const createdScenario = await createProjectionScenario(payload);
        setScenarios((prev) =>
          sortProjectionScenarios([
            buildProjectionScenarioSummary(createdScenario),
            ...prev,
          ])
        );
        await loadScenario(createdScenario.id);
        return createdScenario;
      } catch (err) {
        setError(err.message || "Failed to create projection");
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [loadScenario]
  );

  const duplicateScenarioRecord = React.useCallback(
    async (scenarioId) => {
      setDuplicatingScenarioId(scenarioId);
      setError("");
      try {
        const duplicatedScenario = await duplicateProjectionScenario(scenarioId);
        setScenarios((prev) =>
          sortProjectionScenarios([
            buildProjectionScenarioSummary(duplicatedScenario),
            ...prev,
          ])
        );
        await loadScenario(duplicatedScenario.id);
        return duplicatedScenario;
      } catch (err) {
        setError(err.message || "Failed to duplicate projection");
        throw err;
      } finally {
        setDuplicatingScenarioId("");
      }
    },
    [loadScenario]
  );

  const deleteScenarioRecord = React.useCallback(
    async (scenarioId) => {
      setDeletingScenarioId(scenarioId);
      setError("");
      try {
        await deleteProjectionScenario(scenarioId);
        const remainingScenarios = scenarios.filter((item) => item.id !== scenarioId);
        setScenarios(remainingScenarios);
        if (scenarioId === selectedScenarioIdRef.current) {
          const nextScenarioId = remainingScenarios[0]?.id || "";
          if (nextScenarioId) {
            await loadScenario(nextScenarioId);
          } else {
            clearSelection();
          }
        }
        return { ok: true };
      } catch (err) {
        setError(err.message || "Failed to delete projection");
        throw err;
      } finally {
        setDeletingScenarioId("");
      }
    },
    [clearSelection, loadScenario, scenarios]
  );

  const updateScenarioRecord = React.useCallback(
    async (scenarioId, payload, options = {}) => {
      const { nextResult = null } = options;
      const updatedScenario = await updateProjectionScenario(scenarioId, payload);
      const summarizedScenario = buildProjectionScenarioSummary(updatedScenario);
      const movedOutOfFilter =
        activeEntityFilterId &&
        String(updatedScenario.entity_id || "") !== String(activeEntityFilterId);

      if (movedOutOfFilter) {
        const remainingScenarios = scenarios.filter((item) => item.id !== scenarioId);
        setScenarios(remainingScenarios);
        if (scenarioId === selectedScenarioIdRef.current) {
          const nextScenarioId = remainingScenarios[0]?.id || "";
          if (nextScenarioId) {
            await loadScenario(nextScenarioId);
          } else {
            clearSelection();
          }
        }
      } else {
        setSelectedScenario(updatedScenario);
        if (nextResult) {
          setSelectedScenarioResult(nextResult);
          syncPreviewResult(nextResult);
        }
        setScenarios((prev) =>
          sortProjectionScenarios(
            prev.map((item) => (item.id === updatedScenario.id ? summarizedScenario : item))
          )
        );
      }

      return {
        updatedScenario,
        movedOutOfFilter,
      };
    },
    [
      activeEntityFilterId,
      clearSelection,
      loadScenario,
      scenarios,
      syncPreviewResult,
    ]
  );

  const loadPreview = React.useCallback(async (payload) => {
    const requestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = requestId;
    setIsPreviewLoading(true);
    setPreviewError("");

    try {
      const response = await previewProjectionScenario(payload);
      if (previewRequestIdRef.current !== requestId) {
        return null;
      }
      syncPreviewResult(response.result);
      return response.result;
    } catch (err) {
      if (previewRequestIdRef.current === requestId) {
        setPreviewError(err.message || "Failed to preview projection");
      }
      return null;
    } finally {
      if (previewRequestIdRef.current === requestId) {
        setIsPreviewLoading(false);
      }
    }
  }, [syncPreviewResult]);

  return {
    scenarios,
    selectedScenarioId,
    selectedScenario,
    selectedScenarioResult,
    previewResult,
    isListLoading,
    isScenarioLoading,
    isPreviewLoading,
    isCreating,
    duplicatingScenarioId,
    deletingScenarioId,
    error,
    previewError,
    setError,
    loadScenario,
    loadScenarios,
    loadPreview,
    clearPreviewState,
    syncPreviewResult,
    createScenario: createScenarioRecord,
    duplicateScenario: duplicateScenarioRecord,
    deleteScenario: deleteScenarioRecord,
    updateScenario: updateScenarioRecord,
  };
}
