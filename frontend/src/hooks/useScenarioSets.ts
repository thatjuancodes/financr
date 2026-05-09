import { useState, useCallback, useEffect } from "react";

export interface ScenarioSet {
  id: string;
  name: string;
  description: string;
  scenarioIds: string[];
  pageType: "budget" | "projection";
  createdAt: string;
}

const STORAGE_KEY = "finflow_scenario_sets";

function loadSets(): ScenarioSet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSets(sets: ScenarioSet[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
}

export function useScenarioSets(pageType: "budget" | "projection") {
  const [sets, setSets] = useState<ScenarioSet[]>(() => loadSets());
  const [compareOpen, setCompareOpen] = useState(false);
  const [comparingIds, setComparingIds] = useState<string[]>([]);

  useEffect(() => {
    saveSets(sets);
  }, [sets]);

  const filteredSets = sets.filter((s) => s.pageType === pageType);

  const saveSet = useCallback(
    (name: string, description: string, scenarioIds: string[]) => {
      const newSet: ScenarioSet = {
        id: `set_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name,
        description,
        scenarioIds,
        pageType,
        createdAt: new Date().toISOString(),
      };
      setSets((prev) => [newSet, ...prev]);
      return newSet.id;
    },
    [pageType]
  );

  const deleteSet = useCallback((id: string) => {
    setSets((prev) => prev.filter((s) => s.id !== id));
    setComparingIds((prev) => prev.filter((cid) => cid !== id));
  }, []);

  const applySet = useCallback(
    (id: string) => {
      const set = sets.find((s) => s.id === id);
      return set?.scenarioIds ?? [];
    },
    [sets]
  );

  const toggleCompare = useCallback((id: string) => {
    setComparingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const clearCompare = useCallback(() => {
    setComparingIds([]);
  }, []);

  return {
    sets: filteredSets,
    allSets: sets,
    compareOpen,
    setCompareOpen,
    comparingIds,
    saveSet,
    deleteSet,
    applySet,
    toggleCompare,
    clearCompare,
  };
}