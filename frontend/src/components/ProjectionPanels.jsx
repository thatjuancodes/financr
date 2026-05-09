import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import RowActionsMenu from "./RowActionsMenu";
import Button from "./ui/Button";
import StatCard from "./ui/StatCard";

export function ProjectionMoveBanner({
  moveScenario,
  entities,
  movingScenarioId,
  moveTargetEntityId,
  moveError,
  getScenarioEntityId,
  getScenarioEntityName,
  onMoveTargetEntityIdChange,
  onCancel,
  onMove,
}) {
  if (!moveScenario) {
    return null;
  }

  return (
    <div className="projection-move-banner">
      <div className="projection-move-banner-copy">
        <strong>Move Projection</strong>
        <p className="subtle-text subtle-text-flush">
          Move <strong>{moveScenario.name}</strong> from{" "}
          <strong>{getScenarioEntityName(moveScenario) || "None"}</strong> to another
          entity.
        </p>
      </div>
      <div className="projection-move-banner-controls">
        <label className="stack-fields projection-move-banner-field">
          <span className="subtle-text subtle-text-flush">Target entity</span>
          <select
            value={moveTargetEntityId}
            onChange={(event) => onMoveTargetEntityIdChange(event.target.value)}
            disabled={Boolean(movingScenarioId)}
          >
            <option value="">Select entity</option>
            {entities.map((entity) => (
              <option key={`move-projection-entity-${entity.id}`} value={String(entity.id)}>
                {entity.name} ({entity.type})
              </option>
            ))}
          </select>
        </label>
        <div className="projection-move-banner-actions">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={Boolean(movingScenarioId)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onMove}
            disabled={
              Boolean(movingScenarioId) ||
              !moveTargetEntityId ||
              moveTargetEntityId === getScenarioEntityId(moveScenario)
            }
          >
            {movingScenarioId ? "Moving..." : "Move Projection"}
          </Button>
        </div>
      </div>
      {moveError && (
        <p className="subtle-text subtle-text-error subtle-text-flush">{moveError}</p>
      )}
    </div>
  );
}

export function ProjectionScenarioList({
  isListLoading,
  scenarios,
  isCreating,
  entities,
  selectedScenarioId,
  duplicatingScenarioId,
  deletingScenarioId,
  movingScenarioId,
  formatMoneyForCurrency,
  getScenarioFinalValue,
  getScenarioMonthlyContribution,
  getScenarioDurationMonths,
  getScenarioEntityName,
  onCreateScenario,
  onSelectScenario,
  onOpenMoveScenario,
  onDuplicateScenario,
  onDeleteScenario,
}) {
  return (
    <aside className="projections-sidebar">
      <div className="projections-sidebar-header">
        <p className="subtle-text subtle-text-flush">
          Saved scenarios in this workspace.
        </p>
      </div>

      {isListLoading ? (
        <p className="empty-state">Loading projections...</p>
      ) : scenarios.length === 0 ? (
        <div className="projection-empty-state">
          <p className="empty-state">Create your first projection.</p>
          <Button type="button" size="sm" onClick={onCreateScenario} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Projection"}
          </Button>
        </div>
      ) : (
        <div className="projection-list">
          {scenarios.map((scenario) => {
            const finalValue = getScenarioFinalValue(scenario);
            const isActive = scenario.id === selectedScenarioId;
            const isDuplicating = duplicatingScenarioId === scenario.id;
            const isDeleting = deletingScenarioId === scenario.id;
            const isMoving = movingScenarioId === scenario.id;
            const scenarioEntityName = getScenarioEntityName(scenario);
            const actions = [];
            if (entities.length > 1) {
              actions.push({
                label: isMoving ? "Moving..." : "Move to entity",
                onClick: () => onOpenMoveScenario(scenario),
              });
            }
            actions.push(
              {
                label: isDuplicating ? "Duplicating..." : "Duplicate",
                onClick: () => onDuplicateScenario(scenario.id),
              },
              {
                label: isDeleting ? "Deleting..." : "Delete",
                onClick: () => onDeleteScenario(scenario.id),
              }
            );

            return (
              <div
                key={scenario.id}
                className={`projection-list-item${isActive ? " active" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelectScenario(scenario.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectScenario(scenario.id);
                  }
                }}
              >
                <div className="projection-list-item-header">
                  <div className="projection-list-item-copy">
                    <strong>{scenario.name}</strong>
                    {scenarioEntityName && (
                      <span className="projection-list-item-entity">{scenarioEntityName}</span>
                    )}
                    <div className="projection-list-item-meta">
                      <span className="projection-list-item-detail">
                        {formatMoneyForCurrency(
                          getScenarioMonthlyContribution(scenario),
                          scenario.currency
                        )}
                        /mo
                      </span>
                      <span className="projection-list-item-detail">
                        {getScenarioDurationMonths(scenario)} months
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
                  {formatMoneyForCurrency(finalValue, scenario.currency)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function ProjectionMoneyField({
  currency,
  value,
  placeholder = "0.00",
  onChange,
}) {
  return (
    <div className="projection-money-field">
      <span className="projection-money-prefix">{currency}</span>
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

export function ProjectionEditor({
  draft,
  draftCurrency,
  assumptions,
  entities,
  expenseCategoryOptions,
  incomeCategoryOptions,
  decoratedDisplayResult,
  displayCurrency,
  validationError,
  previewError,
  saveError,
  saveStatusLabel,
  isPreviewLoading,
  workspaceId,
  getCategoryAverageAmount,
  formatMoneyForCurrency,
  formatAmountInput,
  onDraftChange,
  onUpdateDraftAssumptions,
  onUpdateRecurringIncome,
  onUpdateRecurringExpense,
  onUpdateExpenseCategoryChange,
  onAddRecurringIncome,
  onAddRecurringExpense,
  onAddExpenseCategoryChange,
  onRemoveRecurringIncome,
  onRemoveRecurringExpense,
  onRemoveExpenseCategoryChange,
}) {
  return (
    <>
      <div className="projection-status-row">
        <p className="subtle-text subtle-text-flush">
          Workspace: <strong>{workspaceId}</strong>
        </p>
        <span className="projection-save-state">
          {isPreviewLoading ? "Refreshing preview..." : saveStatusLabel}
        </span>
      </div>

      <div className="projection-editor-grid">
        <label className="stack-fields">
          <span className="subtle-text subtle-text-flush">Entity</span>
          <select
            value={draft.entity_id}
            onChange={(event) => onDraftChange("entity_id", event.target.value)}
          >
            <option value="">Select entity</option>
            {entities.map((entity) => (
              <option key={`projection-entity-${entity.id}`} value={String(entity.id)}>
                {entity.name} ({entity.type})
              </option>
            ))}
          </select>
        </label>

        <label className="stack-fields">
          <span className="subtle-text subtle-text-flush">Name</span>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => onDraftChange("name", event.target.value)}
            placeholder="Projection name"
          />
        </label>

        <label className="stack-fields">
          <span className="subtle-text subtle-text-flush">Initial Amount</span>
          <ProjectionMoneyField
            currency={draftCurrency}
            value={draft.initial_amount}
            onChange={(value) => onDraftChange("initial_amount", formatAmountInput(value))}
          />
        </label>

        <label className="stack-fields">
          <span className="subtle-text subtle-text-flush">Interest Rate (%)</span>
          <input
            type="text"
            inputMode="decimal"
            value={draft.annual_interest_rate_percent}
            onChange={(event) =>
              onDraftChange("annual_interest_rate_percent", event.target.value)
            }
            placeholder="12"
          />
        </label>

        <label className="stack-fields">
          <span className="subtle-text subtle-text-flush">Duration (Months)</span>
          <input
            type="number"
            min="1"
            step="1"
            value={draft.duration_months}
            onChange={(event) => onDraftChange("duration_months", event.target.value)}
          />
        </label>

        <label className="stack-fields">
          <span className="subtle-text subtle-text-flush">Extra Monthly Contribution</span>
          <ProjectionMoneyField
            currency={draftCurrency}
            value={draft.monthly_contribution}
            onChange={(value) =>
              onDraftChange("monthly_contribution", formatAmountInput(value))
            }
          />
        </label>

        <label className="stack-fields">
          <span className="subtle-text subtle-text-flush">Currency</span>
          <input type="text" value={draft.currency} readOnly />
        </label>

        <label className="stack-fields">
          <span className="subtle-text subtle-text-flush">Historical Baseline Window</span>
          <input
            type="number"
            min="1"
            step="1"
            value={assumptions.baseline_month_window}
            onChange={(event) =>
              onUpdateDraftAssumptions((current) => ({
                ...current,
                baseline_month_window: event.target.value,
              }))
            }
          />
        </label>

        <label className="stack-fields projection-editor-full">
          <span className="subtle-text subtle-text-flush">Notes</span>
          <textarea
            value={draft.notes}
            onChange={(event) => onDraftChange("notes", event.target.value)}
            placeholder="Optional notes for this scenario..."
          />
        </label>
      </div>

      {(validationError || previewError || saveError) && (
        <p className="subtle-text subtle-text-error subtle-text-flush">
          {validationError || previewError || saveError}
        </p>
      )}

      <div className="projection-assumptions-note">
        <p className="subtle-text subtle-text-flush">
          Existing income and expense history is reference-only by default. This
          projection only changes when you add factors below.
        </p>
      </div>

      <div className="projection-assumptions-grid">
        <div className="projection-assumption-card projection-assumption-card-wide">
          <div className="section-header projection-assumption-header">
            <h3>Recurring Income Adds</h3>
            <div className="section-header-actions">
              <Button type="button" size="sm" onClick={onAddRecurringIncome}>
                Add Income
              </Button>
            </div>
          </div>
          {(assumptions.added_recurring_incomes || []).length === 0 ? (
            <p className="subtle-text subtle-text-flush">
              Add optional monthly income factors. Nothing from existing records is
              applied automatically.
            </p>
          ) : (
            <div className="projection-assumption-list">
              {(assumptions.added_recurring_incomes || []).map((item) => (
                <div
                  key={item.id}
                  className="projection-assumption-row projection-assumption-row-recurring"
                >
                  <input
                    type="text"
                    value={item.name}
                    onChange={(event) =>
                      onUpdateRecurringIncome(item.id, "name", event.target.value)
                    }
                    placeholder="Income name"
                  />
                  <ProjectionMoneyField
                    currency={draftCurrency}
                    value={item.amount}
                    onChange={(value) =>
                      onUpdateRecurringIncome(item.id, "amount", formatAmountInput(value))
                    }
                  />
                  <select
                    value={item.income_category_id}
                    onChange={(event) =>
                      onUpdateRecurringIncome(
                        item.id,
                        "income_category_id",
                        event.target.value
                      )
                    }
                  >
                    <option value="">Any income category</option>
                    {incomeCategoryOptions.map((category) => (
                      <option key={`projection-income-category-${category.id}`} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveRecurringIncome(item.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="projection-assumption-card projection-assumption-card-wide">
          <div className="section-header projection-assumption-header">
            <h3>Recurring Expense Adds</h3>
            <div className="section-header-actions">
              <Button type="button" size="sm" onClick={onAddRecurringExpense}>
                Add Expense
              </Button>
            </div>
          </div>
          {(assumptions.added_recurring_expenses || []).length === 0 ? (
            <p className="subtle-text subtle-text-flush">
              Add optional monthly expense factors. Existing expense history stays
              unchanged unless you model a factor here.
            </p>
          ) : (
            <div className="projection-assumption-list">
              {(assumptions.added_recurring_expenses || []).map((item) => (
                <div
                  key={item.id}
                  className="projection-assumption-row projection-assumption-row-recurring"
                >
                  <input
                    type="text"
                    value={item.name}
                    onChange={(event) =>
                      onUpdateRecurringExpense(item.id, "name", event.target.value)
                    }
                    placeholder="Expense name"
                  />
                  <ProjectionMoneyField
                    currency={draftCurrency}
                    value={item.amount}
                    onChange={(value) =>
                      onUpdateRecurringExpense(item.id, "amount", formatAmountInput(value))
                    }
                  />
                  <select
                    value={item.expense_category_id}
                    onChange={(event) =>
                      onUpdateRecurringExpense(
                        item.id,
                        "expense_category_id",
                        event.target.value
                      )
                    }
                  >
                    <option value="">Any expense category</option>
                    <option value="0">Uncategorized</option>
                    {expenseCategoryOptions.map((category) => (
                      <option key={`projection-expense-category-${category.id}`} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveRecurringExpense(item.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="projection-assumption-card projection-assumption-card-full">
          <div className="section-header projection-assumption-header">
            <h3>Expense Category Changes</h3>
            <div className="section-header-actions">
              <Button type="button" size="sm" onClick={onAddExpenseCategoryChange}>
                Add Category Change
              </Button>
            </div>
          </div>
          {(assumptions.expense_category_percent_changes || []).length === 0 ? (
            <p className="subtle-text subtle-text-flush">
              Example: enter <strong>-20</strong> to cut a category by 20% from its
              historical monthly average.
            </p>
          ) : (
            <div className="projection-assumption-list">
              {(assumptions.expense_category_percent_changes || []).map((item) => {
                const categoryAverage = getCategoryAverageAmount(
                  decoratedDisplayResult,
                  item.expense_category_id
                );
                return (
                  <div key={item.id} className="projection-assumption-row">
                    <select
                      value={item.expense_category_id}
                      onChange={(event) =>
                        onUpdateExpenseCategoryChange(
                          item.id,
                          "expense_category_id",
                          event.target.value
                        )
                      }
                    >
                      <option value="">Select expense category</option>
                      <option value="0">Uncategorized</option>
                      {expenseCategoryOptions.map((category) => (
                        <option
                          key={`projection-expense-change-category-${category.id}`}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <div className="projection-percent-field">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.percent_change}
                        onChange={(event) =>
                          onUpdateExpenseCategoryChange(
                            item.id,
                            "percent_change",
                            event.target.value
                          )
                        }
                        placeholder="-20"
                      />
                      <span className="projection-percent-suffix">%</span>
                    </div>
                    <div className="projection-assumption-hint">
                      Avg: {formatMoneyForCurrency(categoryAverage, displayCurrency)}/mo
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveExpenseCategoryChange(item.id)}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function ProjectionResults({
  decoratedDisplayResult,
  summaryResult,
  summaryLabelSuffix,
  activeTimelinePoint,
  displayCurrency,
  formatMoneyForCurrency,
  onChartFocus,
  onChartBlur,
}) {
  if (!decoratedDisplayResult) {
    return (
      <p className="empty-state">Enter valid values to calculate this projection.</p>
    );
  }

  return (
    <>
      <div className="projection-results-grid projection-results-grid-rich">
        <StatCard
          label={`Final Value${summaryLabelSuffix}`}
          tone="primary"
          value={summaryResult.final_value}
          formatValue={(value) => formatMoneyForCurrency(value, displayCurrency)}
        />
        <StatCard
          label={`Total Contributions${summaryLabelSuffix}`}
          tone="secondary"
          value={summaryResult.total_contributions}
          formatValue={(value) => formatMoneyForCurrency(value, displayCurrency)}
        />
        <StatCard
          label={`Total Interest${summaryLabelSuffix}`}
          tone="success"
          value={summaryResult.total_interest}
          formatValue={(value) => formatMoneyForCurrency(value, displayCurrency)}
        />
        <StatCard
          label="Effective Monthly Contribution"
          tone="dark"
          value={decoratedDisplayResult.effective_monthly_contribution}
          formatValue={(value) => formatMoneyForCurrency(value, displayCurrency)}
        />
        <StatCard
          label="Baseline Monthly Income"
          tone="secondary"
          value={decoratedDisplayResult.baseline_summary?.average_monthly_income ?? 0}
          formatValue={(value) => formatMoneyForCurrency(value, displayCurrency)}
        />
        <StatCard
          label="Baseline Monthly Expenses"
          tone="secondary"
          value={decoratedDisplayResult.baseline_summary?.average_monthly_expenses ?? 0}
          formatValue={(value) => formatMoneyForCurrency(value, displayCurrency)}
        />
        <StatCard
          label="Monthly Factor Delta"
          tone="primary"
          value={
            decoratedDisplayResult.scenario_cashflow_summary
              ?.adjusted_monthly_net_cashflow ?? 0
          }
          formatValue={(value) => formatMoneyForCurrency(value, displayCurrency)}
        />
      </div>

      <div className="projection-chart-card">
        <div className="section-header projection-chart-header">
          <h3>Growth Timeline</h3>
          {activeTimelinePoint ? (
            <span className="projection-chart-state">
              Showing month {activeTimelinePoint.month}
            </span>
          ) : (
            <span className="projection-chart-state">Hover or click a point</span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={decoratedDisplayResult.timeline}
            onMouseMove={onChartFocus}
            onClick={onChartFocus}
            onMouseLeave={onChartBlur}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ee" />
            <XAxis dataKey="month" stroke="#566076" fontSize={11} />
            <YAxis
              stroke="#566076"
              fontSize={11}
              tickFormatter={(value) =>
                Number(value ?? 0).toLocaleString(undefined, {
                  notation: "compact",
                  maximumFractionDigits: 1,
                })
              }
            />
            <Tooltip
              labelFormatter={(label) => `Month ${label}`}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) {
                  return null;
                }
                const point = payload[0]?.payload;
                if (!point) {
                  return null;
                }
                return (
                  <div className="projection-chart-tooltip">
                    <strong>{`Month ${label}`}</strong>
                    <span>
                      Value: {formatMoneyForCurrency(point.value, displayCurrency)}
                    </span>
                    <span>
                      Contributions:{" "}
                      {formatMoneyForCurrency(
                        point.total_contributions,
                        displayCurrency
                      )}
                    </span>
                    <span>
                      Interest:{" "}
                      {formatMoneyForCurrency(point.total_interest, displayCurrency)}
                    </span>
                    <span>
                      Monthly cash flow:{" "}
                      {formatMoneyForCurrency(
                        point.effective_monthly_contribution,
                        displayCurrency
                      )}
                    </span>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#0f766e"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
