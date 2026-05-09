import React from "react";
import { formatAmountInput, parseAmountInput, todayISO } from "../utils/format";
import Button from "./ui/Button";
import RowActionsMenu from "./RowActionsMenu";
import StatCard from "./ui/StatCard";

const NEW_BUDGET_ID = "__new_budget__";

const PAYMENT_PLAN_OPTIONS = [
  { value: "one_time", label: "One-Time" },
  { value: "installment", label: "Installments" },
];

const PAYMENT_FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function buildEmptyDraft(activeEntityFilterId, entities = []) {
  const firstEntityId = String(entities[0]?.id || "").trim();
  return {
    entity_id: String(activeEntityFilterId || "").trim() || firstEntityId,
    name: "",
    category: "",
    target_amount: "",
    payment_plan: "one_time",
    payment_frequency: "monthly",
    payment_amount: "",
    payment_count: "",
    start_date: todayISO(),
    target_date: "",
    notes: "",
    is_active: true,
  };
}

function buildDraftFromItem(item) {
  return {
    entity_id: String(item?.entity_id || ""),
    name: String(item?.name || ""),
    category: String(item?.category || ""),
    target_amount: formatAmountInput(String(item?.target_amount ?? "")),
    payment_plan: String(item?.payment_plan || "one_time"),
    payment_frequency: String(item?.payment_frequency || "monthly"),
    payment_amount: formatAmountInput(String(item?.payment_amount ?? "")),
    payment_count:
      item?.payment_count === null || item?.payment_count === undefined
        ? ""
        : String(item.payment_count),
    start_date: String(item?.start_date || todayISO()),
    target_date: String(item?.target_date || ""),
    notes: String(item?.notes || ""),
    is_active: Boolean(item?.is_active),
  };
}

function normalizePayload(draft) {
  const entityId = String(draft?.entity_id || "").trim();
  const name = String(draft?.name || "").trim();
  const category = String(draft?.category || "").trim();
  const targetAmountRaw = String(draft?.target_amount || "").trim();
  const targetAmount = parseAmountInput(targetAmountRaw);
  const paymentPlan = String(draft?.payment_plan || "").trim().toLowerCase();
  const paymentFrequency = String(draft?.payment_frequency || "").trim().toLowerCase();
  const paymentAmountRaw = String(draft?.payment_amount || "").trim();
  const paymentAmount = paymentAmountRaw ? parseAmountInput(paymentAmountRaw) : null;
  const paymentCountRaw = String(draft?.payment_count || "").trim();
  const paymentCount = paymentCountRaw ? Number(paymentCountRaw) : null;
  const startDate = String(draft?.start_date || "").trim();
  const targetDate = String(draft?.target_date || "").trim();
  const notes = String(draft?.notes || "").trim();

  if (!entityId || !name || !targetAmountRaw || !Number.isFinite(targetAmount) || targetAmount <= 0) {
    throw new Error("Entity, name, and target amount are required.");
  }
  if (!startDate) {
    throw new Error("A payment start date is required.");
  }
  if (paymentPlan === "one_time") {
    return {
      entity_id: entityId,
      name,
      category: category || null,
      target_amount: targetAmount,
      payment_plan: "one_time",
      payment_frequency: "once",
      start_date: startDate,
      target_date: targetDate || null,
      notes: notes || null,
      is_active: Boolean(draft?.is_active),
    };
  }

  if (!paymentAmountRaw || !Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new Error("Installment budgets need a valid payment amount.");
  }
  if (paymentCountRaw && (!Number.isInteger(paymentCount) || paymentCount <= 0)) {
    throw new Error("Terms must be a positive whole number.");
  }

  return {
    entity_id: entityId,
    name,
    category: category || null,
    target_amount: targetAmount,
    payment_plan: "installment",
    payment_frequency: paymentFrequency || "monthly",
    payment_amount: paymentAmount,
    payment_count: paymentCountRaw ? paymentCount : null,
    start_date: startDate,
    target_date: targetDate || null,
    notes: notes || null,
    is_active: Boolean(draft?.is_active),
  };
}

function budgetToPayload(item) {
  if (!item) {
    return null;
  }
  if (String(item.payment_plan || "") === "one_time") {
    return {
      entity_id: String(item.entity_id || ""),
      name: String(item.name || ""),
      category: item.category ? String(item.category) : null,
      target_amount: Number(item.target_amount ?? 0),
      payment_plan: "one_time",
      payment_frequency: "once",
      start_date: String(item.start_date || ""),
      target_date: item.target_date ? String(item.target_date) : null,
      notes: item.notes ? String(item.notes) : null,
      is_active: Boolean(item.is_active),
    };
  }
  return {
    entity_id: String(item.entity_id || ""),
    name: String(item.name || ""),
    category: item.category ? String(item.category) : null,
    target_amount: Number(item.target_amount ?? 0),
    payment_plan: String(item.payment_plan || "installment"),
    payment_frequency: String(item.payment_frequency || "monthly"),
    payment_amount: Number(item.payment_amount ?? 0),
    payment_count:
      item.payment_count === null || item.payment_count === undefined
        ? null
        : Number(item.payment_count),
    start_date: String(item.start_date || ""),
    target_date: item.target_date ? String(item.target_date) : null,
    notes: item.notes ? String(item.notes) : null,
    is_active: Boolean(item.is_active),
  };
}

function formatScheduleLabel(item) {
  if (item.payment_plan === "one_time") {
    return `One-time on ${item.start_date}`;
  }
  const countLabel =
    item.payment_count === null || item.payment_count === undefined
      ? `${item.scheduled_payment_count} planned payments`
      : `${item.payment_count} payments`;
  return `${String(item.payment_frequency || "").replace("_", " ")} · ${countLabel}`;
}

function buildSummary(budgets = [], balance = null) {
  const rows = Array.isArray(budgets) ? budgets : [];
  const activeRows = rows.filter((item) => item.is_active);
  const todayImpact = activeRows.reduce(
    (sum, item) => sum + Number(item?.today_impact ?? 0),
    0
  );
  const weeklyImpact = activeRows.reduce(
    (sum, item) => sum + Number(item?.weekly_impact ?? 0),
    0
  );
  const monthlyImpact = activeRows.reduce(
    (sum, item) => sum + Number(item?.monthly_impact ?? 0),
    0
  );
  const remainingCommitment = activeRows.reduce(
    (sum, item) => sum + Number(item?.remaining_amount ?? 0),
    0
  );
  const safeToSpend = Number(balance?.safe_to_spend ?? balance?.balance ?? 0);
  const currentBalance = Number(balance?.balance ?? 0);
  return {
    activeCount: activeRows.length,
    todayImpact,
    weeklyImpact,
    monthlyImpact,
    remainingCommitment,
    projectedSafeToSpend: safeToSpend - monthlyImpact,
    projectedBalance: currentBalance - monthlyImpact,
  };
}

function BudgetMoneyField({
  value,
  currencyLabel,
  placeholder = "0.00",
  onChange,
}) {
  return (
    <div className="projection-money-field">
      <span className="projection-money-prefix">{currencyLabel}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function RightPanelBudgetView({
  entities = [],
  activeEntityFilterId = undefined,
  budgets = [],
  balance = null,
  formatMoney,
  onCreateBudget,
  onUpdateBudget,
  onDeleteBudget,
}) {
  const [selectedBudgetId, setSelectedBudgetId] = React.useState("");
  const [draft, setDraft] = React.useState(null);
  const [editorError, setEditorError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const summary = React.useMemo(() => buildSummary(budgets, balance), [budgets, balance]);
  const selectedBudgetItem = React.useMemo(() => {
    if (selectedBudgetId === NEW_BUDGET_ID) {
      return null;
    }
    return (
      (Array.isArray(budgets) ? budgets : []).find(
        (item) => String(item.id) === String(selectedBudgetId)
      ) || null
    );
  }, [budgets, selectedBudgetId]);

  React.useEffect(() => {
    const rows = Array.isArray(budgets) ? budgets : [];
    if (selectedBudgetId === NEW_BUDGET_ID) {
      return;
    }
    if (rows.length === 0) {
      setSelectedBudgetId("");
      setDraft(null);
      return;
    }
    const matchingBudget = rows.find(
      (item) => String(item.id) === String(selectedBudgetId)
    );
    if (!matchingBudget) {
      setSelectedBudgetId(String(rows[0].id));
      return;
    }
    setDraft(buildDraftFromItem(matchingBudget));
  }, [budgets, selectedBudgetId]);

  React.useEffect(() => {
    if (!selectedBudgetItem && selectedBudgetId !== NEW_BUDGET_ID) {
      return;
    }
    if (selectedBudgetItem) {
      setDraft(buildDraftFromItem(selectedBudgetItem));
      setEditorError("");
    }
  }, [selectedBudgetItem, selectedBudgetId]);

  const payloadPreview = React.useMemo(() => {
    if (!draft) {
      return null;
    }
    try {
      return normalizePayload(draft);
    } catch (_error) {
      return null;
    }
  }, [draft]);

  const validationError = React.useMemo(() => {
    if (!draft) {
      return "";
    }
    try {
      normalizePayload(draft);
      return "";
    } catch (error) {
      return error.message || "Invalid budget draft";
    }
  }, [draft]);

  const draftIsSaved = React.useMemo(() => {
    if (!draft || !selectedBudgetItem || selectedBudgetId === NEW_BUDGET_ID || !payloadPreview) {
      return false;
    }
    return JSON.stringify(payloadPreview) === JSON.stringify(budgetToPayload(selectedBudgetItem));
  }, [draft, payloadPreview, selectedBudgetId, selectedBudgetItem]);

  const activeBudgetMetrics = selectedBudgetItem || null;
  const showEntityField = !String(activeEntityFilterId || "").trim();

  const updateDraft = React.useCallback((field, value) => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        [field]:
          field === "target_amount" || field === "payment_amount"
            ? formatAmountInput(value)
            : value,
      };
    });
  }, []);

  const handleSelectBudget = React.useCallback((budgetId) => {
    setSelectedBudgetId(String(budgetId));
    setEditorError("");
  }, []);

  const handleCreateNewBudget = React.useCallback(() => {
    setSelectedBudgetId(NEW_BUDGET_ID);
    setDraft(buildEmptyDraft(activeEntityFilterId, entities));
    setEditorError("");
  }, [activeEntityFilterId, entities]);

  const handleSaveDraft = async () => {
    if (!draft) {
      return;
    }
    try {
      const payload = normalizePayload(draft);
      setEditorError("");
      setIsSubmitting(true);
      if (selectedBudgetId === NEW_BUDGET_ID) {
        await onCreateBudget(payload);
        setSelectedBudgetId("");
      } else if (selectedBudgetItem) {
        await onUpdateBudget(selectedBudgetItem.id, payload);
      }
    } catch (error) {
      setEditorError(error.message || "Failed to save budget");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSelectedBudget = async () => {
    if (!selectedBudgetItem) {
      return;
    }
    const confirmed = window.confirm(`Delete budget "${selectedBudgetItem.name}"?`);
    if (!confirmed) {
      return;
    }
    try {
      setEditorError("");
      setIsSubmitting(true);
      await onDeleteBudget(selectedBudgetItem.id);
      setSelectedBudgetId("");
      setDraft(null);
    } catch (error) {
      setEditorError(error.message || "Failed to delete budget");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBudgetActive = async (item) => {
    try {
      setEditorError("");
      await onUpdateBudget(item.id, {
        ...budgetToPayload(item),
        is_active: !item.is_active,
      });
    } catch (error) {
      setEditorError(error.message || "Failed to update budget");
    }
  };

  const saveStatusLabel = isSubmitting
    ? "Saving budget..."
    : selectedBudgetId === NEW_BUDGET_ID
      ? "New budget draft"
      : draftIsSaved
        ? "All changes saved"
        : draft
          ? "Changes not saved"
          : "Select a budget";

  return (
    <section className="projections-page">
      <div className="section-header">
        <h2>Budgeting</h2>
        <div className="section-header-actions">
          <Button type="button" size="sm" onClick={handleCreateNewBudget}>
            New Budget
          </Button>
        </div>
      </div>

      <div className="projections-layout">
        <aside className="projections-sidebar">
          <div className="projections-sidebar-header">
            <p className="subtle-text subtle-text-flush">
              Planned purchases and future commitments for the current entity scope.
            </p>
          </div>

          {budgets.length === 0 ? (
            <div className="projection-empty-state">
              <p className="empty-state">Create your first budget plan.</p>
              <Button type="button" size="sm" onClick={handleCreateNewBudget}>
                Create Budget
              </Button>
            </div>
          ) : (
            <div className="projection-list">
              {budgets.map((item) => {
                const actions = [
                  {
                    label: item.is_active ? "Pause budget" : "Activate budget",
                    onClick: () => handleToggleBudgetActive(item),
                  },
                  {
                    label: "Delete",
                    onClick: async () => {
                      const confirmed = window.confirm(`Delete budget "${item.name}"?`);
                      if (!confirmed) {
                        return;
                      }
                      try {
                        setEditorError("");
                        await onDeleteBudget(item.id);
                        if (String(selectedBudgetId) === String(item.id)) {
                          setSelectedBudgetId("");
                          setDraft(null);
                        }
                      } catch (error) {
                        setEditorError(error.message || "Failed to delete budget");
                      }
                    },
                  },
                ];

                return (
                  <div
                    key={item.id}
                    className={`projection-list-item${
                      String(selectedBudgetId) === String(item.id) ? " active" : ""
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectBudget(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSelectBudget(item.id);
                      }
                    }}
                  >
                    <div className="projection-list-item-header">
                      <div className="projection-list-item-copy">
                        <strong>{item.name}</strong>
                        {showEntityField && item.entity_name ? (
                          <span className="projection-list-item-entity">
                            {item.entity_name}
                          </span>
                        ) : null}
                        <div className="projection-list-item-meta">
                          <span className="projection-list-item-detail">
                            {item.is_active ? "Active" : "Paused"}
                          </span>
                          <span className="projection-list-item-detail">
                            {formatScheduleLabel(item)}
                          </span>
                        </div>
                      </div>
                      <div
                        className="projection-list-item-menu"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <RowActionsMenu actions={actions} />
                      </div>
                    </div>
                    <div className="projection-list-item-value">
                      {formatMoney(item.remaining_amount)}
                    </div>
                    <p className="subtle-text subtle-text-flush budget-list-footnote">
                      30-day impact {formatMoney(item.monthly_impact)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        <div className="projections-detail">
          {!draft ? (
            <div className="projection-empty-state projection-empty-state-large">
              <p className="empty-state">Select a budget or create a new one.</p>
            </div>
          ) : (
            <>
              <div className="projection-status-row">
                <p className="subtle-text subtle-text-flush">
                  {selectedBudgetId === NEW_BUDGET_ID ? (
                    <>Drafting a new purchase plan</>
                  ) : (
                    <>
                      Budget status:{" "}
                      <strong>{selectedBudgetItem?.is_active ? "Active" : "Paused"}</strong>
                    </>
                  )}
                </p>
                <span className="projection-save-state">{saveStatusLabel}</span>
              </div>

              <div className="projection-editor-grid">
                {showEntityField && (
                  <label className="stack-fields">
                    <span className="subtle-text subtle-text-flush">Entity</span>
                    <select
                      value={draft.entity_id}
                      onChange={(event) => updateDraft("entity_id", event.target.value)}
                    >
                      <option value="">Select entity</option>
                      {entities.map((entity) => (
                        <option key={`budget-entity-${entity.id}`} value={String(entity.id)}>
                          {entity.name} ({entity.type})
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="stack-fields">
                  <span className="subtle-text subtle-text-flush">Budget Name</span>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(event) => updateDraft("name", event.target.value)}
                    placeholder="Buy phone, laptop, move to Spain"
                  />
                </label>

                <label className="stack-fields">
                  <span className="subtle-text subtle-text-flush">Target Amount</span>
                  <BudgetMoneyField
                    currencyLabel="Plan"
                    value={draft.target_amount}
                    onChange={(value) => updateDraft("target_amount", value)}
                  />
                </label>

                <label className="stack-fields">
                  <span className="subtle-text subtle-text-flush">Payment Type</span>
                  <select
                    value={draft.payment_plan}
                    onChange={(event) => updateDraft("payment_plan", event.target.value)}
                  >
                    {PAYMENT_PLAN_OPTIONS.map((option) => (
                      <option key={`budget-plan-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="stack-fields">
                  <span className="subtle-text subtle-text-flush">
                    {draft.payment_plan === "one_time" ? "Payment Date" : "First Payment Date"}
                  </span>
                  <input
                    type="date"
                    value={draft.start_date}
                    onChange={(event) => updateDraft("start_date", event.target.value)}
                  />
                </label>

                <label className="stack-fields">
                  <span className="subtle-text subtle-text-flush">Target Date</span>
                  <input
                    type="date"
                    value={draft.target_date}
                    onChange={(event) => updateDraft("target_date", event.target.value)}
                  />
                </label>

                {draft.payment_plan !== "one_time" ? (
                  <>
                    <label className="stack-fields">
                      <span className="subtle-text subtle-text-flush">Installment Amount</span>
                      <BudgetMoneyField
                        currencyLabel="Each"
                        value={draft.payment_amount}
                        onChange={(value) => updateDraft("payment_amount", value)}
                      />
                    </label>

                    <label className="stack-fields">
                      <span className="subtle-text subtle-text-flush">Frequency</span>
                      <select
                        value={draft.payment_frequency}
                        onChange={(event) =>
                          updateDraft("payment_frequency", event.target.value)
                        }
                      >
                        {PAYMENT_FREQUENCY_OPTIONS.map((option) => (
                          <option
                            key={`budget-frequency-${option.value}`}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="stack-fields">
                      <span className="subtle-text subtle-text-flush">Terms / Payments</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={draft.payment_count}
                        onChange={(event) => updateDraft("payment_count", event.target.value)}
                        placeholder="Optional fixed count"
                      />
                    </label>
                  </>
                ) : (
                  <div className="projection-assumption-hint">
                    One-time budgets apply the full amount on the payment date.
                  </div>
                )}

                <label className="stack-fields">
                  <span className="subtle-text subtle-text-flush">Category</span>
                  <input
                    type="text"
                    value={draft.category}
                    onChange={(event) => updateDraft("category", event.target.value)}
                    placeholder="Tech, relocation, home"
                  />
                </label>

                <label className="stack-fields projection-editor-full">
                  <span className="subtle-text subtle-text-flush">Notes</span>
                  <textarea
                    value={draft.notes}
                    onChange={(event) => updateDraft("notes", event.target.value)}
                    placeholder="Particulars, payment terms, vendor details, relocation context..."
                  />
                </label>

                <label className="budget-inline-toggle projection-editor-full">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.is_active)}
                    onChange={(event) => updateDraft("is_active", event.target.checked)}
                  />
                  <span>Include this budget in current health impact calculations</span>
                </label>
              </div>

              <div className="budget-editor-actions">
                {selectedBudgetItem ? (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={handleDeleteSelectedBudget}
                    disabled={isSubmitting}
                  >
                    Delete Budget
                  </Button>
                ) : (
                  <span />
                )}
                <div className="budget-editor-actions-right">
                  {selectedBudgetId === NEW_BUDGET_ID ? (
                    <Button
                      type="button"
                      variant="subtle"
                      onClick={() => {
                        setSelectedBudgetId("");
                        setDraft(null);
                        setEditorError("");
                      }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={Boolean(validationError) || isSubmitting}
                  >
                    {selectedBudgetId === NEW_BUDGET_ID ? "Create Budget" : "Save Budget"}
                  </Button>
                </div>
              </div>

              {(editorError || validationError) && (
                <p className="subtle-text subtle-text-error subtle-text-flush budget-editor-error">
                  {editorError || validationError}
                </p>
              )}

              <div className="projection-results-grid projection-results-grid-rich">
                <StatCard
                  label="Today Impact"
                  tone={(activeBudgetMetrics?.today_impact ?? 0) > 0 ? "danger" : "light"}
                  value={activeBudgetMetrics?.today_impact ?? 0}
                  formatValue={formatMoney}
                />
                <StatCard
                  label="7-Day Impact"
                  tone={(activeBudgetMetrics?.weekly_impact ?? 0) > 0 ? "danger" : "light"}
                  value={activeBudgetMetrics?.weekly_impact ?? 0}
                  formatValue={formatMoney}
                />
                <StatCard
                  label="30-Day Impact"
                  tone={(activeBudgetMetrics?.monthly_impact ?? 0) > 0 ? "danger" : "light"}
                  value={activeBudgetMetrics?.monthly_impact ?? 0}
                  formatValue={formatMoney}
                />
                <StatCard
                  label="Remaining Commitment"
                  tone="expenseLight"
                  value={activeBudgetMetrics?.remaining_amount ?? 0}
                  formatValue={formatMoney}
                />
              </div>

              <div className="projection-assumptions-grid">
                <article className="projection-assumption-card">
                  <div className="projection-assumption-header">
                    <h3>Health Impact</h3>
                    <p className="subtle-text subtle-text-flush">
                      How this budget changes near-term financial room.
                    </p>
                  </div>
                  <div className="budget-impact-stack">
                    <div className="budget-impact-row">
                      <span>Selected budget 30-day impact</span>
                      <strong>{formatMoney(Number(activeBudgetMetrics?.monthly_impact ?? 0))}</strong>
                    </div>
                    <div className="budget-impact-row">
                      <span>Current balance</span>
                      <strong>{formatMoney(Number(balance?.balance ?? 0))}</strong>
                    </div>
                    <div className="budget-impact-row">
                      <span>Current safe to spend</span>
                      <strong>{formatMoney(Number(balance?.safe_to_spend ?? 0))}</strong>
                    </div>
                    <div className="budget-impact-row">
                      <span>Safe to spend after all active budgets (30 days)</span>
                      <strong>{formatMoney(summary.projectedSafeToSpend)}</strong>
                    </div>
                    <div className="budget-impact-row">
                      <span>All active budget commitments remaining</span>
                      <strong>{formatMoney(summary.remainingCommitment)}</strong>
                    </div>
                  </div>
                </article>

                <article className="projection-assumption-card">
                  <div className="projection-assumption-header">
                    <h3>Schedule Preview</h3>
                    <p className="subtle-text subtle-text-flush">
                      Upcoming payments for the selected budget.
                    </p>
                  </div>
                  {activeBudgetMetrics?.schedule_preview?.length ? (
                    <div className="budget-schedule-list">
                      {activeBudgetMetrics.schedule_preview.map((entry) => (
                        <div
                          key={`${entry.date}-${entry.amount}`}
                          className="budget-schedule-row"
                        >
                          <span>{entry.date}</span>
                          <strong>{formatMoney(entry.amount)}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-state">Save this budget to view its schedule preview.</p>
                  )}
                  {activeBudgetMetrics?.final_payment_date ? (
                    <p className="subtle-text subtle-text-flush budget-schedule-footnote">
                      Final scheduled payment: <strong>{activeBudgetMetrics.final_payment_date}</strong>
                    </p>
                  ) : null}
                </article>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
