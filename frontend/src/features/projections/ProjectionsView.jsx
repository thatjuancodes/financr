import React from "react";
import Banner from "../../components/ui/Banner";
import Button from "../../components/ui/Button";
import {
  ProjectionEditor,
  ProjectionMoveBanner,
  ProjectionResults,
  ProjectionScenarioList,
} from "../../components/ProjectionPanels";
import {
  DEFAULT_PROJECTION_SCENARIO_PAYLOAD,
  DEFAULT_PROJECTION_WORKSPACE_ID,
  createNewProjectionExpenseAdjustmentDraft,
  createNewProjectionExpenseCategoryChangeDraft,
  createNewProjectionIncomeAdjustmentDraft,
  createProjectionDraft,
  decorateProjectionResult,
  draftToProjectionPayload,
  validateProjectionDraft,
} from "../../utils/projections";
import { formatAmountInput } from "../../utils/format";
import {
  buildNewScenarioName,
  getCategoryAverageAmount,
  scenarioMatchesPayload,
} from "./projections.utils";
import { useProjections } from "./useProjections";

export default function ProjectionsView({
  formatMoneyForCurrency,
  workspaceId = DEFAULT_PROJECTION_WORKSPACE_ID,
  entities = [],
  activeEntityFilterId,
  expenseCategoryOptions = [],
  incomeCategoryOptions = [],
}) {
  const {
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
    loadPreview,
    clearPreviewState,
    syncPreviewResult,
    createScenario,
    duplicateScenario,
    deleteScenario,
    updateScenario,
  } = useProjections({
    workspaceId,
    activeEntityFilterId,
  });
  const [draft, setDraft] = React.useState(null);
  const [movingScenarioId, setMovingScenarioId] = React.useState("");
  const [moveScenario, setMoveScenario] = React.useState(null);
  const [moveTargetEntityId, setMoveTargetEntityId] = React.useState("");
  const [moveError, setMoveError] = React.useState("");
  const [saveStatus, setSaveStatus] = React.useState("idle");
  const [saveError, setSaveError] = React.useState("");
  const [activeTimelineMonth, setActiveTimelineMonth] = React.useState(null);
  const hydratedScenarioIdRef = React.useRef("");

  const defaultEntityId = React.useMemo(() => {
    if (activeEntityFilterId) {
      return String(activeEntityFilterId);
    }
    return entities[0]?.id ? String(entities[0].id) : "";
  }, [activeEntityFilterId, entities]);

  React.useEffect(() => {
    if (!selectedScenarioId || !selectedScenario) {
      hydratedScenarioIdRef.current = "";
      setDraft(null);
      setSaveStatus("idle");
      setSaveError("");
      setMoveScenario(null);
      setMoveTargetEntityId("");
      setMoveError("");
      setActiveTimelineMonth(null);
      return;
    }
    if (hydratedScenarioIdRef.current === selectedScenarioId) {
      return;
    }
    hydratedScenarioIdRef.current = selectedScenarioId;
    setDraft(createProjectionDraft(selectedScenario));
    setSaveStatus("saved");
    setSaveError("");
    setMoveScenario(null);
    setMoveTargetEntityId("");
    setMoveError("");
    setActiveTimelineMonth(null);
  }, [selectedScenario, selectedScenarioId]);

  const validationError = React.useMemo(
    () => (draft ? validateProjectionDraft(draft) : ""),
    [draft]
  );

  const draftPayload = React.useMemo(
    () => (draft ? draftToProjectionPayload(draft) : null),
    [draft]
  );

  React.useEffect(() => {
    if (!draftPayload || !draft || validationError) {
      clearPreviewState();
      return undefined;
    }

    if (selectedScenario && scenarioMatchesPayload(selectedScenario, draftPayload)) {
      syncPreviewResult(selectedScenarioResult);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      loadPreview(draftPayload);
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [
    clearPreviewState,
    draft,
    draftPayload,
    loadPreview,
    selectedScenario,
    selectedScenarioResult,
    syncPreviewResult,
    validationError,
  ]);

  React.useEffect(() => {
    if (!selectedScenario || !draftPayload || !draft) {
      return undefined;
    }
    if (validationError) {
      setSaveStatus("invalid");
      return undefined;
    }
    if (scenarioMatchesPayload(selectedScenario, draftPayload)) {
      setSaveError("");
      setSaveStatus("saved");
      return undefined;
    }

    setSaveError("");
    setSaveStatus("pending");
    const timeoutId = window.setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await updateScenario(selectedScenario.id, draftPayload, {
          nextResult: previewResult || selectedScenarioResult,
        });
        setSaveStatus("saved");
      } catch (err) {
        setSaveError(err.message || "Failed to save projection");
        setSaveStatus("error");
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [
    draft,
    draftPayload,
    previewResult,
    selectedScenario,
    selectedScenarioResult,
    updateScenario,
    validationError,
  ]);

  const displayCurrency = draftPayload?.currency || selectedScenario?.currency || "PHP";
  const draftCurrency = String(draft?.currency || displayCurrency || "PHP")
    .trim()
    .toUpperCase();
  const displayResult = previewResult || selectedScenarioResult;
  const decoratedDisplayResult = React.useMemo(() => {
    if (!displayResult) {
      return null;
    }
    return decorateProjectionResult(
      displayResult,
      draftPayload?.initial_amount ?? selectedScenario?.initial_amount ?? 0,
      displayResult?.effective_monthly_contribution ??
        draftPayload?.monthly_contribution ??
        selectedScenario?.monthly_contribution ??
        0
    );
  }, [displayResult, draftPayload, selectedScenario]);

  const activeTimelinePoint = React.useMemo(() => {
    if (!decoratedDisplayResult || activeTimelineMonth === null) {
      return null;
    }
    return (
      decoratedDisplayResult.timeline.find(
        (point) => Number(point.month) === Number(activeTimelineMonth)
      ) || null
    );
  }, [activeTimelineMonth, decoratedDisplayResult]);

  const summaryResult = activeTimelinePoint
    ? {
        final_value: activeTimelinePoint.value,
        total_contributions: activeTimelinePoint.total_contributions,
        total_interest: activeTimelinePoint.total_interest,
      }
    : decoratedDisplayResult;

  const updateDraftAssumptions = React.useCallback((updater) => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }
      const nextAssumptions = updater(prev.cashflow_assumptions || {});
      return {
        ...prev,
        cashflow_assumptions: nextAssumptions,
      };
    });
  }, []);

  const updateRecurringIncome = (itemId, field, value) => {
    updateDraftAssumptions((assumptions) => ({
      ...assumptions,
      added_recurring_incomes: (assumptions.added_recurring_incomes || []).map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      ),
    }));
  };

  const updateRecurringExpense = (itemId, field, value) => {
    updateDraftAssumptions((assumptions) => ({
      ...assumptions,
      added_recurring_expenses: (assumptions.added_recurring_expenses || []).map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      ),
    }));
  };

  const updateExpenseCategoryChange = (itemId, field, value) => {
    updateDraftAssumptions((assumptions) => ({
      ...assumptions,
      expense_category_percent_changes: (
        assumptions.expense_category_percent_changes || []
      ).map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    }));
  };

  const addRecurringIncome = () => {
    updateDraftAssumptions((assumptions) => ({
      ...assumptions,
      added_recurring_incomes: [
        ...(assumptions.added_recurring_incomes || []),
        createNewProjectionIncomeAdjustmentDraft(
          assumptions.added_recurring_incomes?.length || 0
        ),
      ],
    }));
  };

  const addRecurringExpense = () => {
    updateDraftAssumptions((assumptions) => ({
      ...assumptions,
      added_recurring_expenses: [
        ...(assumptions.added_recurring_expenses || []),
        createNewProjectionExpenseAdjustmentDraft(
          assumptions.added_recurring_expenses?.length || 0
        ),
      ],
    }));
  };

  const addExpenseCategoryChange = () => {
    updateDraftAssumptions((assumptions) => ({
      ...assumptions,
      expense_category_percent_changes: [
        ...(assumptions.expense_category_percent_changes || []),
        createNewProjectionExpenseCategoryChangeDraft(
          assumptions.expense_category_percent_changes?.length || 0
        ),
      ],
    }));
  };

  const removeRecurringIncome = (itemId) => {
    updateDraftAssumptions((assumptions) => ({
      ...assumptions,
      added_recurring_incomes: (assumptions.added_recurring_incomes || []).filter(
        (item) => item.id !== itemId
      ),
    }));
  };

  const removeRecurringExpense = (itemId) => {
    updateDraftAssumptions((assumptions) => ({
      ...assumptions,
      added_recurring_expenses: (assumptions.added_recurring_expenses || []).filter(
        (item) => item.id !== itemId
      ),
    }));
  };

  const removeExpenseCategoryChange = (itemId) => {
    updateDraftAssumptions((assumptions) => ({
      ...assumptions,
      expense_category_percent_changes: (
        assumptions.expense_category_percent_changes || []
      ).filter((item) => item.id !== itemId),
    }));
  };

  const handleCreateScenario = async () => {
    setError("");
    try {
      if (!defaultEntityId) {
        setError("Create or select an entity before creating projections.");
        return;
      }
      const payload = {
        ...DEFAULT_PROJECTION_SCENARIO_PAYLOAD,
        workspace_id: workspaceId,
        entity_id: defaultEntityId,
        name: buildNewScenarioName(scenarios),
      };
      await createScenario(payload);
      setSaveStatus("saved");
      setSaveError("");
      setActiveTimelineMonth(null);
    } catch (_err) {}
  };

  const handleDuplicateScenario = async (scenarioId) => {
    setError("");
    try {
      await duplicateScenario(scenarioId);
      setSaveStatus("saved");
      setSaveError("");
      setActiveTimelineMonth(null);
    } catch (_err) {}
  };

  const handleDeleteScenario = async (scenarioId) => {
    if (typeof window !== "undefined") {
      const shouldDelete = window.confirm(
        "Delete this projection scenario? This cannot be undone."
      );
      if (!shouldDelete) {
        return;
      }
    }

    setError("");
    try {
      await deleteScenario(scenarioId);
    } catch (_err) {}
  };

  const handleSelectScenario = async (scenarioId) => {
    if (!scenarioId || scenarioId === selectedScenarioId) {
      return;
    }
    setError("");
    setSaveStatus("idle");
    setSaveError("");
    await loadScenario(scenarioId);
  };

  const getScenarioFinalValue = (scenario) => {
    if (scenario.id === selectedScenarioId && displayResult) {
      return Number(displayResult.final_value ?? 0);
    }
    return Number(scenario?.result_summary?.final_value ?? 0);
  };

  const getScenarioMonthlyContribution = (scenario) => {
    if (scenario.id === selectedScenarioId && draftPayload) {
      return Number(draftPayload.monthly_contribution ?? 0);
    }
    return Number(scenario?.monthly_contribution ?? 0);
  };

  const getScenarioDurationMonths = (scenario) => {
    if (scenario.id === selectedScenarioId && draftPayload) {
      return Number(draftPayload.duration_months ?? 0);
    }
    return Number(scenario?.duration_months ?? 0);
  };

  const getScenarioEntityId = (scenario) => {
    if (scenario.id === selectedScenarioId && draft) {
      return String(draft.entity_id || "");
    }
    return String(scenario?.entity_id || "");
  };

  const getScenarioEntityName = (scenario) => {
    const entityId = getScenarioEntityId(scenario);
    if (!entityId) {
      return "";
    }
    const matchingEntity = entities.find(
      (entity) => String(entity.id || "") === String(entityId)
    );
    if (matchingEntity?.name) {
      return matchingEntity.name;
    }
    return String(scenario?.entity_name || "");
  };

  const saveStatusLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "pending"
      ? "Changes pending..."
      : saveStatus === "saved"
      ? "All changes saved"
      : saveStatus === "invalid"
      ? "Fix validation errors to save"
      : saveStatus === "error"
      ? "Save failed"
      : "";

  const summaryLabelSuffix =
    activeTimelinePoint && Number.isFinite(Number(activeTimelinePoint.month))
      ? ` (Month ${activeTimelinePoint.month})`
      : "";

  const handleChartFocus = (chartState) => {
    const point = chartState?.activePayload?.[0]?.payload;
    if (!point || !Number.isFinite(Number(point.month))) {
      return;
    }
    setActiveTimelineMonth(Number(point.month));
  };

  const handleChartBlur = () => {
    setActiveTimelineMonth(null);
  };

  const closeMovePanel = () => {
    if (movingScenarioId) {
      return;
    }
    setMoveScenario(null);
    setMoveTargetEntityId("");
    setMoveError("");
  };

  const handleOpenMoveScenario = (scenario) => {
    const currentEntityId = getScenarioEntityId(scenario);
    const nextTargetEntityId =
      String(
        entities.find((entity) => String(entity.id || "") !== currentEntityId)?.id || ""
      ) || currentEntityId;
    setMoveScenario(scenario);
    setMoveTargetEntityId(nextTargetEntityId);
    setMoveError("");
  };

  const handleMoveScenario = async () => {
    if (!moveScenario) {
      return;
    }

    const scenarioId = String(moveScenario.id || "");
    const nextEntityId = String(moveTargetEntityId || "").trim();
    const currentEntityId = getScenarioEntityId(moveScenario);
    if (!nextEntityId) {
      setMoveError("Select an entity to move this projection into.");
      return;
    }
    if (nextEntityId === currentEntityId) {
      setMoveError("Choose a different entity.");
      return;
    }

    setMovingScenarioId(scenarioId);
    setMoveError("");
    setError("");

    try {
      const { movedOutOfFilter } = await updateScenario(scenarioId, {
        entity_id: nextEntityId,
      });

      if (!movedOutOfFilter && scenarioId === selectedScenarioId) {
        await loadScenario(scenarioId);
      }

      setMoveScenario(null);
      setMoveTargetEntityId("");
      setMoveError("");
    } catch (err) {
      setMoveError(err.message || "Failed to move projection");
    } finally {
      setMovingScenarioId("");
    }
  };

  const assumptions = draft?.cashflow_assumptions || {
    baseline_month_window: "6",
    added_recurring_incomes: [],
    added_recurring_expenses: [],
    expense_category_percent_changes: [],
  };

  return (
    <section className="projections-page">
      <div className="section-header">
        <h2>Projections</h2>
        <div className="section-header-actions">
          <Button type="button" size="sm" onClick={handleCreateScenario} disabled={isCreating}>
            {isCreating ? "Creating..." : "New Projection"}
          </Button>
        </div>
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      <ProjectionMoveBanner
        moveScenario={moveScenario}
        entities={entities}
        movingScenarioId={movingScenarioId}
        moveTargetEntityId={moveTargetEntityId}
        moveError={moveError}
        getScenarioEntityId={getScenarioEntityId}
        getScenarioEntityName={getScenarioEntityName}
        onMoveTargetEntityIdChange={setMoveTargetEntityId}
        onCancel={closeMovePanel}
        onMove={handleMoveScenario}
      />

      <div className="projections-layout">
        <ProjectionScenarioList
          isListLoading={isListLoading}
          scenarios={scenarios}
          isCreating={isCreating}
          entities={entities}
          selectedScenarioId={selectedScenarioId}
          duplicatingScenarioId={duplicatingScenarioId}
          deletingScenarioId={deletingScenarioId}
          movingScenarioId={movingScenarioId}
          formatMoneyForCurrency={formatMoneyForCurrency}
          getScenarioFinalValue={getScenarioFinalValue}
          getScenarioMonthlyContribution={getScenarioMonthlyContribution}
          getScenarioDurationMonths={getScenarioDurationMonths}
          getScenarioEntityName={getScenarioEntityName}
          onCreateScenario={handleCreateScenario}
          onSelectScenario={handleSelectScenario}
          onOpenMoveScenario={handleOpenMoveScenario}
          onDuplicateScenario={handleDuplicateScenario}
          onDeleteScenario={handleDeleteScenario}
        />

        <div className="projections-detail">
          {!selectedScenarioId ? (
            <div className="projection-empty-state projection-empty-state-large">
              <p className="empty-state">Create your first projection.</p>
            </div>
          ) : isScenarioLoading || !draft ? (
            <p className="empty-state">Loading scenario...</p>
          ) : (
            <>
              <ProjectionEditor
                draft={draft}
                draftCurrency={draftCurrency}
                assumptions={assumptions}
                entities={entities}
                expenseCategoryOptions={expenseCategoryOptions}
                incomeCategoryOptions={incomeCategoryOptions}
                decoratedDisplayResult={decoratedDisplayResult}
                displayCurrency={displayCurrency}
                validationError={validationError}
                previewError={previewError}
                saveError={saveError}
                saveStatusLabel={saveStatusLabel}
                isPreviewLoading={isPreviewLoading}
                workspaceId={workspaceId}
                getCategoryAverageAmount={getCategoryAverageAmount}
                formatMoneyForCurrency={formatMoneyForCurrency}
                formatAmountInput={formatAmountInput}
                onDraftChange={(field, value) =>
                  setDraft((prev) => ({ ...prev, [field]: value }))
                }
                onUpdateDraftAssumptions={updateDraftAssumptions}
                onUpdateRecurringIncome={updateRecurringIncome}
                onUpdateRecurringExpense={updateRecurringExpense}
                onUpdateExpenseCategoryChange={updateExpenseCategoryChange}
                onAddRecurringIncome={addRecurringIncome}
                onAddRecurringExpense={addRecurringExpense}
                onAddExpenseCategoryChange={addExpenseCategoryChange}
                onRemoveRecurringIncome={removeRecurringIncome}
                onRemoveRecurringExpense={removeRecurringExpense}
                onRemoveExpenseCategoryChange={removeExpenseCategoryChange}
              />

              <ProjectionResults
                decoratedDisplayResult={decoratedDisplayResult}
                summaryResult={summaryResult}
                summaryLabelSuffix={summaryLabelSuffix}
                activeTimelinePoint={activeTimelinePoint}
                displayCurrency={displayCurrency}
                formatMoneyForCurrency={formatMoneyForCurrency}
                onChartFocus={handleChartFocus}
                onChartBlur={handleChartBlur}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
