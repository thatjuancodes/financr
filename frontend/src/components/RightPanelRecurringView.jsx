import React from "react";
import Button from "./ui/Button";
import StatCard from "./ui/StatCard";
import RowActionsMenu from "./RowActionsMenu";
import {
  RECURRING_FREQUENCIES,
  recurringFrequencyLabel,
  recurringFrequencyOptionsForType,
  recurringAccountOptionLabel,
  getRecurringTransferName,
  getRecurringTransferCategoryLabel,
  getRecurringTransferDirection,
} from "../utils/recurring";
import { formatAmountInput } from "../utils/format";

export default function RightPanelRecurringView({
  openAddRecurringDrawer,
  recurringIncomeBreakdownTotals,
  recurringExpenseBreakdownTotals,
  recurringSpendingPowerMonthly,
  recurringSpendingPowerWeekly,
  formatMoney,
  pendingRecurringItems,
  onConfirmRecurring,
  onSkipRecurring,
  activeEntityFilterId,
  handleRecurringCategoryUpdate,
  incomeCategoryOptions,
  expenseCategoryOptions,
  getIncomeCategoryBadgeStyle,
  getExpenseCategoryBadgeStyle,
  recurringItems,
  recurringFrequencyFilter,
  setRecurringFrequencyFilter,
  recurringExpenseCategoryFilter,
  setRecurringExpenseCategoryFilter,
  filteredRecurringExpenseTotals,
  filteredRecurringItems,
  filteredRecurringIncome,
  filteredRecurringTransfers,
  filteredRecurringExpenses,
  renderRecurringTypeTable,
  activeRecurringItem,
  closeRecurringDrawer,
  isRecurringDrawerSubmitting,
  handleRecurringDrawerSubmit,
  activeRecurringDraft,
  updateRecurringDraft,
  activeRecurringSourceAccounts,
  activeRecurringDestinationAccounts,
  activeRecurringSourceAccount,
  isActiveRecurringTransferCrossEntity,
  recurringDrawerError,
  handleRecurringDrawerDelete,
  isAddRecurringDrawerOpen,
  closeAddRecurringDrawer,
  isAddRecurringDrawerSubmitting,
  handleAddRecurringDrawerSubmit,
  recurringForm,
  onRecurringFormChange,
  addRecurringSourceAccounts,
  addRecurringDestinationAccounts,
  addRecurringSourceAccount,
  isAddRecurringTransferCrossEntity,
  addRecurringDrawerError,
}) {
  return (
    <>
      <section>
        <div className="recurring-header-row">
          <h2>Recurring</h2>
          <div className="section-header-actions">
            <Button
              type="button"
              size="sm"
              className="recurring-add-button"
              onClick={openAddRecurringDrawer}
            >
              Add recurring
            </Button>
          </div>
        </div>

        <div className="recurring-overview-grid">
          <div className="recurring-overview-breakdown">
            <p className="subtle-text subtle-text-flush recurring-breakdown-label">
              Breakdown
            </p>
            <div className="recurring-breakdown-cards">
              <StatCard
                label="Income Monthly"
                tone="incomeLight"
                value={recurringIncomeBreakdownTotals.monthly}
                formatValue={formatMoney}
              />
              <StatCard
                label="Income Weekly"
                tone="incomeLight"
                value={recurringIncomeBreakdownTotals.weekly}
                formatValue={formatMoney}
              />
              <StatCard
                label="Expenses Monthly"
                tone="expenseLight"
                value={recurringExpenseBreakdownTotals.monthly}
                formatValue={formatMoney}
              />
              <StatCard
                label="Expenses Weekly"
                tone="expenseLight"
                value={recurringExpenseBreakdownTotals.weekly}
                formatValue={formatMoney}
              />
              <StatCard
                label="Spending Power Monthly"
                tone={recurringSpendingPowerMonthly >= 0 ? "success" : "danger"}
                value={recurringSpendingPowerMonthly}
                formatValue={formatMoney}
              />
              <StatCard
                label="Spending Power Weekly"
                tone={recurringSpendingPowerWeekly >= 0 ? "success" : "danger"}
                value={recurringSpendingPowerWeekly}
                formatValue={formatMoney}
              />
            </div>
          </div>
          <div className="recurring-overview-dues">
            <div className="recurring-pending-section">
              <p className="subtle-text subtle-text-flush recurring-pending-label">
                Due today
              </p>
              {pendingRecurringItems.length === 0 ? (
                <p className="empty-state">Nothing is due today.</p>
              ) : (
                <div className="table-scroll">
                  <table className="table recurring-due-table">
                    <colgroup>
                      <col className="recurring-due-column" />
                      <col className="recurring-amount-column" />
                      <col className="recurring-name-column" />
                      <col className="recurring-category-column" />
                      <col className="due-action-column" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="cell-left recurring-due-column">Due</th>
                        <th className="recurring-amount-column">Amount</th>
                        <th className="recurring-name-column">Name / Source</th>
                        <th className="recurring-category-column">Category</th>
                        <th className="cell-actions due-action-column" aria-label="Actions">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRecurringItems.map((item) => {
                        const canConfirm = typeof onConfirmRecurring === "function";
                        const canSkip = typeof onSkipRecurring === "function";
                        const transferDirection =
                          item.type === "transfer"
                            ? getRecurringTransferDirection(item, activeEntityFilterId)
                            : "neutral";
                        const transferCategoryStyle =
                          item.type === "transfer" && item.mirror_as_income_expense
                            ? transferDirection === "incoming"
                              ? getIncomeCategoryBadgeStyle(
                                  item.income_category_id,
                                  item.income_category_name
                                )
                              : transferDirection === "outgoing"
                                ? getExpenseCategoryBadgeStyle(
                                    item.expense_category_id,
                                    item.expense_category_name
                                  )
                                : undefined
                            : undefined;

                        return (
                          <tr key={`pending-recurring-${item.id}`}>
                            <td className="cell-left recurring-due-column">
                              {item.next_due_date}
                            </td>
                            <td className="recurring-amount-column">
                              {formatMoney(item.amount)}
                            </td>
                            <td className="recurring-name-column">
                              {item.type === "transfer"
                                ? getRecurringTransferName(item, activeEntityFilterId)
                                : item.category}
                            </td>
                            <td className="recurring-category-column">
                              {item.type === "transfer" ? (
                                <span
                                  className="expense-category-badge expense-category-badge-static"
                                  style={transferCategoryStyle}
                                >
                                  <span className="expense-category-badge-label">
                                    {getRecurringTransferCategoryLabel(
                                      item,
                                      activeEntityFilterId
                                    )}
                                  </span>
                                </span>
                              ) : (
                                <RowActionsMenu
                                  align="left"
                                  menuClassName="expense-category-dropdown"
                                  itemClassName="expense-category-dropdown-item"
                                  actions={[
                                    {
                                      label: `${
                                        item.type === "income"
                                          ? item.income_category_id === null ||
                                            item.income_category_id === undefined
                                            ? "✓ "
                                            : ""
                                          : item.expense_category_id === null ||
                                            item.expense_category_id === undefined
                                            ? "✓ "
                                            : ""
                                      }Uncategorized`,
                                      onClick: () => handleRecurringCategoryUpdate(item, null),
                                    },
                                    ...(
                                      item.type === "income"
                                        ? incomeCategoryOptions
                                        : expenseCategoryOptions
                                    ).map((categoryOption) => ({
                                      label: `${
                                        item.type === "income"
                                          ? item.income_category_id === categoryOption.id
                                            ? "✓ "
                                            : ""
                                          : item.expense_category_id === categoryOption.id
                                            ? "✓ "
                                            : ""
                                      }${categoryOption.name}`,
                                      onClick: () =>
                                        handleRecurringCategoryUpdate(
                                          item,
                                          categoryOption.id
                                        ),
                                    })),
                                  ]}
                                  renderTrigger={({ open, setOpen, buttonRef }) => (
                                    <button
                                      ref={buttonRef}
                                      type="button"
                                      className={`expense-category-badge${open ? " open" : ""}`}
                                      style={
                                        item.type === "income"
                                          ? getIncomeCategoryBadgeStyle(
                                              item.income_category_id,
                                              item.income_category_name
                                            )
                                          : getExpenseCategoryBadgeStyle(
                                              item.expense_category_id,
                                              item.expense_category_name
                                            )
                                      }
                                      aria-haspopup="menu"
                                      aria-expanded={open}
                                      aria-label={`Change recurring category for ${item.category}`}
                                      onClick={() => setOpen((prev) => !prev)}
                                    >
                                      <span className="expense-category-badge-label">
                                        {item.type === "income"
                                          ? item.income_category_name || "Uncategorized"
                                          : item.expense_category_name || "Uncategorized"}
                                      </span>
                                      <span className="expense-category-badge-caret">▾</span>
                                    </button>
                                  )}
                                />
                              )}
                            </td>
                            <td className="cell-actions due-action-column">
                              <div className="due-action-buttons">
                                {canConfirm && (
                                  <button
                                    type="button"
                                    className="due-action-icon due-action-confirm"
                                    aria-label={`Confirm recurring item ${item.category}`}
                                    onClick={() => onConfirmRecurring(item.id)}
                                    title="Confirm"
                                  >
                                    ✓
                                  </button>
                                )}
                                {canSkip && (
                                  <button
                                    type="button"
                                    className="due-action-icon due-action-skip"
                                    aria-label={`Skip recurring item ${item.category}`}
                                    onClick={() => onSkipRecurring(item.id)}
                                    title="Skip"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {recurringItems.length > 0 && (
          <div className="recurring-toolbar">
            <div className="recurring-filters">
              <select
                value={recurringFrequencyFilter}
                onChange={(event) => setRecurringFrequencyFilter(event.target.value)}
                aria-label="Filter recurring items by frequency"
              >
                <option value="all">All Frequencies</option>
                {RECURRING_FREQUENCIES.map((frequency) => (
                  <option key={`recurring-filter-${frequency}`} value={frequency}>
                    {recurringFrequencyLabel(frequency)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {recurringItems.length === 0 ? (
          <p className="empty-state">No recurring items configured yet.</p>
        ) : filteredRecurringItems.length === 0 ? (
          <p className="empty-state">No recurring items for this frequency.</p>
        ) : (
          <>
            <p className="subtle-text subtle-text-flush recurring-table-hint">
              Click a row to edit.
            </p>
            {renderRecurringTypeTable(
              filteredRecurringIncome,
              "Recurring Income",
              "No recurring income for this frequency."
            )}
            {renderRecurringTypeTable(
              filteredRecurringTransfers,
              "Recurring Transfers",
              "No recurring transfers for this frequency."
            )}
            {renderRecurringTypeTable(
              filteredRecurringExpenses,
              "Recurring Expenses",
              recurringExpenseCategoryFilter === "all"
                ? "No recurring expenses for this frequency."
                : "No recurring expenses for this category and frequency.",
              <div className="recurring-section-tools">
                <p className="recurring-section-total">
                  Monthly {formatMoney(filteredRecurringExpenseTotals?.monthly ?? 0)} • Weekly{" "}
                  {formatMoney(filteredRecurringExpenseTotals?.weekly ?? 0)}
                </p>
                <div className="recurring-section-filter">
                  <select
                    value={recurringExpenseCategoryFilter}
                    onChange={(event) =>
                      setRecurringExpenseCategoryFilter?.(event.target.value)
                    }
                    aria-label="Filter recurring expenses by category"
                  >
                    <option value="all">All Categories</option>
                    <option value="uncategorized">Uncategorized</option>
                    {expenseCategoryOptions.map((item) => (
                      <option key={`recurring-expense-filter-${item.id}`} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </section>
      {activeRecurringItem && (
        <div className="side-drawer-backdrop" onClick={closeRecurringDrawer}>
          <aside
            className="side-drawer recurring-edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Edit recurring item"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2>Edit Recurring Item</h2>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={closeRecurringDrawer}
                disabled={isRecurringDrawerSubmitting}
              >
                Close
              </Button>
            </div>
            <p className="subtle-text subtle-text-flush">
              Last confirmed: {activeRecurringItem.last_confirmed_date ?? "Never"}
            </p>
            <form
              onSubmit={handleRecurringDrawerSubmit}
              className="recurring-drawer-form"
            >
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Type</span>
                <select
                  value={activeRecurringDraft?.type ?? activeRecurringItem.type}
                  onChange={(event) => {
                    const nextType = event.target.value;
                    updateRecurringDraft(activeRecurringItem.id, "type", nextType);
                    if (nextType !== "expense" && nextType !== "transfer") {
                      updateRecurringDraft(
                        activeRecurringItem.id,
                        "expense_category_id",
                        ""
                      );
                    }
                    if (nextType !== "income" && nextType !== "transfer") {
                      updateRecurringDraft(
                        activeRecurringItem.id,
                        "income_category_id",
                        ""
                      );
                    }
                    if (nextType !== "transfer") {
                      updateRecurringDraft(activeRecurringItem.id, "from_account_id", "");
                      updateRecurringDraft(activeRecurringItem.id, "to_account_id", "");
                      updateRecurringDraft(
                        activeRecurringItem.id,
                        "mirror_as_income_expense",
                        false
                      );
                    }
                    if (nextType !== "income") {
                      const currentFrequency =
                        activeRecurringDraft?.frequency ?? activeRecurringItem.frequency;
                      if (currentFrequency === "semi_monthly") {
                        updateRecurringDraft(
                          activeRecurringItem.id,
                          "frequency",
                          "monthly"
                        );
                      }
                    }
                  }}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="transfer">Transfer</option>
                </select>
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">
                  {(activeRecurringDraft?.type ?? activeRecurringItem.type) === "transfer"
                    ? "Label"
                    : "Name / Source"}
                </span>
                <input
                  type="text"
                  value={activeRecurringDraft?.category ?? activeRecurringItem.category}
                  onChange={(event) =>
                    updateRecurringDraft(
                      activeRecurringItem.id,
                      "category",
                      event.target.value
                    )
                  }
                  required
                />
              </label>
              {(activeRecurringDraft?.type ?? activeRecurringItem.type) === "transfer" ? (
                <>
                  <label className="stack-fields">
                    <span className="subtle-text subtle-text-flush">From Account</span>
                    <select
                      value={
                        activeRecurringDraft?.from_account_id ??
                        (activeRecurringItem.from_account_id === null ||
                        activeRecurringItem.from_account_id === undefined
                          ? ""
                          : String(activeRecurringItem.from_account_id))
                      }
                      onChange={(event) =>
                        updateRecurringDraft(
                          activeRecurringItem.id,
                          "from_account_id",
                          event.target.value
                        )
                      }
                      required
                    >
                      <option value="">Select source account</option>
                      {activeRecurringSourceAccounts.map((account) => (
                        <option key={`recurring-edit-source-${account.id}`} value={account.id}>
                          {recurringAccountOptionLabel(account)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="stack-fields">
                    <span className="subtle-text subtle-text-flush">To Account</span>
                    <select
                      value={
                        activeRecurringDraft?.to_account_id ??
                        (activeRecurringItem.to_account_id === null ||
                        activeRecurringItem.to_account_id === undefined
                          ? ""
                          : String(activeRecurringItem.to_account_id))
                      }
                      onChange={(event) =>
                        updateRecurringDraft(
                          activeRecurringItem.id,
                          "to_account_id",
                          event.target.value
                        )
                      }
                      required
                    >
                      <option value="">Select destination account</option>
                      {activeRecurringDestinationAccounts.map((account) => (
                        <option
                          key={`recurring-edit-destination-${account.id}`}
                          value={account.id}
                        >
                          {recurringAccountOptionLabel(account)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {activeRecurringSourceAccount &&
                    activeRecurringDestinationAccounts.length === 0 && (
                      <p className="subtle-text subtle-text-error subtle-text-flush">
                        No compatible destination accounts for this currency.
                      </p>
                    )}
                  <label className="stack-fields">
                    <span className="subtle-text subtle-text-flush">Transfer Fee</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        activeRecurringDraft?.transfer_fee_amount ??
                        formatAmountInput(String(activeRecurringItem.transfer_fee_amount ?? ""))
                      }
                      onChange={(event) =>
                        updateRecurringDraft(
                          activeRecurringItem.id,
                          "transfer_fee_amount",
                          event.target.value
                        )
                      }
                      placeholder="0.00"
                    />
                  </label>
                  {isActiveRecurringTransferCrossEntity && (
                    <label className="checkbox-row recurring-transfer-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(
                          activeRecurringDraft?.mirror_as_income_expense ??
                            activeRecurringItem.mirror_as_income_expense
                        )}
                        onChange={(event) =>
                          updateRecurringDraft(
                            activeRecurringItem.id,
                            "mirror_as_income_expense",
                            event.target.checked
                          )
                        }
                      />
                      <span>
                        Also record as expense for source and income for destination
                      </span>
                    </label>
                  )}
                  {isActiveRecurringTransferCrossEntity && (
                    <>
                      <p className="subtle-text subtle-text-flush recurring-transfer-mapping-label">
                        {Boolean(
                          activeRecurringDraft?.mirror_as_income_expense ??
                            activeRecurringItem.mirror_as_income_expense
                        )
                          ? "From account records the expense. To account records the income."
                          : "Enable the toggle to also record the source side as expense and the destination side as income."}
                      </p>
                      <label className="stack-fields">
                        <span className="subtle-text subtle-text-flush">
                          Source Expense Category
                        </span>
                        <select
                          value={
                            activeRecurringDraft?.expense_category_id ??
                            (activeRecurringItem.expense_category_id === null ||
                            activeRecurringItem.expense_category_id === undefined
                              ? ""
                              : String(activeRecurringItem.expense_category_id))
                          }
                          onChange={(event) =>
                            updateRecurringDraft(
                              activeRecurringItem.id,
                              "expense_category_id",
                              event.target.value
                            )
                          }
                          disabled={
                            !Boolean(
                              activeRecurringDraft?.mirror_as_income_expense ??
                                activeRecurringItem.mirror_as_income_expense
                            )
                          }
                        >
                          <option value="">Uncategorized</option>
                          {expenseCategoryOptions.map((item) => (
                            <option
                              key={`recurring-edit-transfer-expense-category-${item.id}`}
                              value={item.id}
                            >
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="stack-fields">
                        <span className="subtle-text subtle-text-flush">
                          Destination Income Category
                        </span>
                        <select
                          value={
                            activeRecurringDraft?.income_category_id ??
                            (activeRecurringItem.income_category_id === null ||
                            activeRecurringItem.income_category_id === undefined
                              ? ""
                              : String(activeRecurringItem.income_category_id))
                          }
                          onChange={(event) =>
                            updateRecurringDraft(
                              activeRecurringItem.id,
                              "income_category_id",
                              event.target.value
                            )
                          }
                          disabled={
                            !Boolean(
                              activeRecurringDraft?.mirror_as_income_expense ??
                                activeRecurringItem.mirror_as_income_expense
                            )
                          }
                        >
                          <option value="">Uncategorized</option>
                          {incomeCategoryOptions.map((item) => (
                            <option
                              key={`recurring-edit-transfer-income-category-${item.id}`}
                              value={item.id}
                            >
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                </>
              ) : (
                <label className="stack-fields">
                  <span className="subtle-text subtle-text-flush">Category</span>
                  <select
                    value={
                      (activeRecurringDraft?.type ?? activeRecurringItem.type) === "income"
                        ? activeRecurringDraft?.income_category_id ??
                          (activeRecurringItem.income_category_id === null ||
                          activeRecurringItem.income_category_id === undefined
                            ? ""
                            : String(activeRecurringItem.income_category_id))
                        : activeRecurringDraft?.expense_category_id ??
                          (activeRecurringItem.expense_category_id === null ||
                          activeRecurringItem.expense_category_id === undefined
                            ? ""
                            : String(activeRecurringItem.expense_category_id))
                    }
                    onChange={(event) =>
                      updateRecurringDraft(
                        activeRecurringItem.id,
                        (activeRecurringDraft?.type ?? activeRecurringItem.type) === "income"
                          ? "income_category_id"
                          : "expense_category_id",
                        event.target.value
                      )
                    }
                  >
                    <option value="">Uncategorized</option>
                    {(
                      (activeRecurringDraft?.type ?? activeRecurringItem.type) === "income"
                        ? incomeCategoryOptions
                        : expenseCategoryOptions
                    ).map((item) => (
                      <option
                        key={`recurring-edit-${
                          (activeRecurringDraft?.type ?? activeRecurringItem.type) === "income"
                            ? "income"
                            : "expense"
                        }-category-${item.id}`}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Description</span>
                <input
                  type="text"
                  value={activeRecurringDraft?.description ?? activeRecurringItem.description ?? ""}
                  onChange={(event) =>
                    updateRecurringDraft(
                      activeRecurringItem.id,
                      "description",
                      event.target.value
                    )
                  }
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Frequency</span>
                <select
                  value={activeRecurringDraft?.frequency ?? activeRecurringItem.frequency}
                  onChange={(event) => {
                    const nextFrequency = event.target.value;
                    const currentType =
                      activeRecurringDraft?.type ?? activeRecurringItem.type;
                    if (nextFrequency === "semi_monthly" && currentType !== "income") {
                      updateRecurringDraft(activeRecurringItem.id, "frequency", "monthly");
                      return;
                    }
                    updateRecurringDraft(
                      activeRecurringItem.id,
                      "frequency",
                      nextFrequency
                    );
                    if (nextFrequency === "semi_monthly") {
                      const nextDay1 =
                        activeRecurringDraft?.semi_monthly_day_1 ??
                        (activeRecurringItem.semi_monthly_day_1 === null ||
                        activeRecurringItem.semi_monthly_day_1 === undefined
                          ? ""
                          : String(activeRecurringItem.semi_monthly_day_1));
                      const nextDay2 =
                        activeRecurringDraft?.semi_monthly_day_2 ??
                        (activeRecurringItem.semi_monthly_day_2 === null ||
                        activeRecurringItem.semi_monthly_day_2 === undefined
                          ? ""
                          : String(activeRecurringItem.semi_monthly_day_2));
                      if (!String(nextDay1).trim()) {
                        updateRecurringDraft(
                          activeRecurringItem.id,
                          "semi_monthly_day_1",
                          "15"
                        );
                      }
                      if (!String(nextDay2).trim()) {
                        updateRecurringDraft(
                          activeRecurringItem.id,
                          "semi_monthly_day_2",
                          "30"
                        );
                      }
                    }
                  }}
                >
                  {recurringFrequencyOptionsForType(
                    activeRecurringDraft?.type ?? activeRecurringItem.type
                  ).map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {recurringFrequencyLabel(frequency)}
                    </option>
                  ))}
                </select>
              </label>
              {(activeRecurringDraft?.type ?? activeRecurringItem.type) === "income" &&
                (activeRecurringDraft?.frequency ?? activeRecurringItem.frequency) ===
                  "semi_monthly" && (
                  <>
                    <label className="stack-fields">
                      <span className="subtle-text subtle-text-flush">Cutoff Day 1</span>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        inputMode="numeric"
                        value={
                          activeRecurringDraft?.semi_monthly_day_1 ??
                          (activeRecurringItem.semi_monthly_day_1 === null ||
                          activeRecurringItem.semi_monthly_day_1 === undefined
                            ? "15"
                            : String(activeRecurringItem.semi_monthly_day_1))
                        }
                        onChange={(event) =>
                          updateRecurringDraft(
                            activeRecurringItem.id,
                            "semi_monthly_day_1",
                            event.target.value
                          )
                        }
                        required
                      />
                    </label>
                    <label className="stack-fields">
                      <span className="subtle-text subtle-text-flush">Cutoff Day 2</span>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        inputMode="numeric"
                        value={
                          activeRecurringDraft?.semi_monthly_day_2 ??
                          (activeRecurringItem.semi_monthly_day_2 === null ||
                          activeRecurringItem.semi_monthly_day_2 === undefined
                            ? "30"
                            : String(activeRecurringItem.semi_monthly_day_2))
                        }
                        onChange={(event) =>
                          updateRecurringDraft(
                            activeRecurringItem.id,
                            "semi_monthly_day_2",
                            event.target.value
                          )
                        }
                        required
                      />
                    </label>
                  </>
                )}
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Next Due</span>
                <input
                  type="date"
                  value={activeRecurringDraft?.next_due_date ?? activeRecurringItem.next_due_date}
                  onChange={(event) =>
                    updateRecurringDraft(
                      activeRecurringItem.id,
                      "next_due_date",
                      event.target.value
                    )
                  }
                  required
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={
                    activeRecurringDraft?.amount ??
                    formatAmountInput(String(activeRecurringItem.amount ?? ""))
                  }
                  onChange={(event) =>
                    updateRecurringDraft(activeRecurringItem.id, "amount", event.target.value)
                  }
                  required
                />
              </label>
              {recurringDrawerError && (
                <p className="subtle-text subtle-text-error subtle-text-flush">
                  {recurringDrawerError}
                </p>
              )}
              <div className="recurring-drawer-actions">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="recurring-drawer-remove-button"
                  onClick={handleRecurringDrawerDelete}
                  disabled={isRecurringDrawerSubmitting}
                >
                  Remove
                </Button>
                <Button type="submit" size="sm" disabled={isRecurringDrawerSubmitting}>
                  {isRecurringDrawerSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </aside>
        </div>
      )}
      {isAddRecurringDrawerOpen && (
        <div className="side-drawer-backdrop" onClick={closeAddRecurringDrawer}>
          <aside
            className="side-drawer recurring-edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Add recurring item"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2>Add recurring</h2>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={closeAddRecurringDrawer}
                disabled={isAddRecurringDrawerSubmitting}
              >
                Close
              </Button>
            </div>
            <form
              onSubmit={handleAddRecurringDrawerSubmit}
              className="recurring-drawer-form"
            >
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Type</span>
                <select
                  value={recurringForm?.type ?? "expense"}
                  onChange={(event) => {
                    const nextType = event.target.value;
                    onRecurringFormChange?.("type", nextType);
                    if (nextType !== "expense" && nextType !== "transfer") {
                      onRecurringFormChange?.("expense_category_id", "");
                    }
                    if (nextType !== "income" && nextType !== "transfer") {
                      onRecurringFormChange?.("income_category_id", "");
                    }
                    if (nextType !== "transfer") {
                      onRecurringFormChange?.("from_account_id", "");
                      onRecurringFormChange?.("to_account_id", "");
                      onRecurringFormChange?.("mirror_as_income_expense", false);
                    }
                    if (
                      nextType !== "income" &&
                      (recurringForm?.frequency ?? "monthly") === "semi_monthly"
                    ) {
                      onRecurringFormChange?.("frequency", "monthly");
                    }
                  }}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="transfer">Transfer</option>
                </select>
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={recurringForm?.amount ?? ""}
                  onChange={(event) => onRecurringFormChange?.("amount", event.target.value)}
                  required
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">
                  {(recurringForm?.type ?? "expense") === "transfer"
                    ? "Label"
                    : "Name / Source"}
                </span>
                <input
                  type="text"
                  value={recurringForm?.category ?? ""}
                  onChange={(event) => onRecurringFormChange?.("category", event.target.value)}
                  required
                />
              </label>
              {(recurringForm?.type ?? "expense") === "transfer" ? (
                <>
                  <label className="stack-fields">
                    <span className="subtle-text subtle-text-flush">From Account</span>
                    <select
                      value={recurringForm?.from_account_id ?? ""}
                      onChange={(event) =>
                        onRecurringFormChange?.("from_account_id", event.target.value)
                      }
                      required
                    >
                      <option value="">Select source account</option>
                      {addRecurringSourceAccounts.map((account) => (
                        <option key={`recurring-add-source-${account.id}`} value={account.id}>
                          {recurringAccountOptionLabel(account)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="stack-fields">
                    <span className="subtle-text subtle-text-flush">To Account</span>
                    <select
                      value={recurringForm?.to_account_id ?? ""}
                      onChange={(event) =>
                        onRecurringFormChange?.("to_account_id", event.target.value)
                      }
                      required
                    >
                      <option value="">Select destination account</option>
                      {addRecurringDestinationAccounts.map((account) => (
                        <option
                          key={`recurring-add-destination-${account.id}`}
                          value={account.id}
                        >
                          {recurringAccountOptionLabel(account)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {addRecurringSourceAccount &&
                    addRecurringDestinationAccounts.length === 0 && (
                      <p className="subtle-text subtle-text-error subtle-text-flush">
                        No compatible destination accounts for this currency.
                      </p>
                    )}
                  <label className="stack-fields">
                    <span className="subtle-text subtle-text-flush">Transfer Fee</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={recurringForm?.transfer_fee_amount ?? ""}
                      onChange={(event) =>
                        onRecurringFormChange?.("transfer_fee_amount", event.target.value)
                      }
                      placeholder="0.00"
                    />
                  </label>
                  {isAddRecurringTransferCrossEntity && (
                    <label className="checkbox-row recurring-transfer-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(recurringForm?.mirror_as_income_expense)}
                        onChange={(event) =>
                          onRecurringFormChange?.(
                            "mirror_as_income_expense",
                            event.target.checked
                          )
                        }
                      />
                      <span>
                        Also record as expense for source and income for destination
                      </span>
                    </label>
                  )}
                  {isAddRecurringTransferCrossEntity && (
                    <>
                      <p className="subtle-text subtle-text-flush recurring-transfer-mapping-label">
                        {recurringForm?.mirror_as_income_expense
                          ? "From account records the expense. To account records the income."
                          : "Enable the toggle to also record the source side as expense and the destination side as income."}
                      </p>
                      <label className="stack-fields">
                        <span className="subtle-text subtle-text-flush">
                          Source Expense Category
                        </span>
                        <select
                          value={recurringForm?.expense_category_id ?? ""}
                          onChange={(event) =>
                            onRecurringFormChange?.("expense_category_id", event.target.value)
                          }
                          disabled={!recurringForm?.mirror_as_income_expense}
                        >
                          <option value="">Uncategorized</option>
                          {expenseCategoryOptions.map((item) => (
                            <option
                              key={`recurring-add-transfer-expense-category-${item.id}`}
                              value={item.id}
                            >
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="stack-fields">
                        <span className="subtle-text subtle-text-flush">
                          Destination Income Category
                        </span>
                        <select
                          value={recurringForm?.income_category_id ?? ""}
                          onChange={(event) =>
                            onRecurringFormChange?.("income_category_id", event.target.value)
                          }
                          disabled={!recurringForm?.mirror_as_income_expense}
                        >
                          <option value="">Uncategorized</option>
                          {incomeCategoryOptions.map((item) => (
                            <option
                              key={`recurring-add-transfer-income-category-${item.id}`}
                              value={item.id}
                            >
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                </>
              ) : (
                <label className="stack-fields">
                  <span className="subtle-text subtle-text-flush">Category</span>
                  <select
                    value={
                      (recurringForm?.type ?? "expense") === "income"
                        ? recurringForm?.income_category_id ?? ""
                        : recurringForm?.expense_category_id ?? ""
                    }
                    onChange={(event) =>
                      onRecurringFormChange?.(
                        (recurringForm?.type ?? "expense") === "income"
                          ? "income_category_id"
                          : "expense_category_id",
                        event.target.value
                      )
                    }
                  >
                    <option value="">Uncategorized</option>
                    {((recurringForm?.type ?? "expense") === "income"
                      ? incomeCategoryOptions
                      : expenseCategoryOptions
                    ).map((item) => (
                      <option
                        key={`recurring-add-${
                          (recurringForm?.type ?? "expense") === "income"
                            ? "income"
                            : "expense"
                        }-category-${item.id}`}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Description (optional)</span>
                <input
                  type="text"
                  value={recurringForm?.description ?? ""}
                  onChange={(event) =>
                    onRecurringFormChange?.("description", event.target.value)
                  }
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Frequency</span>
                <select
                  value={recurringForm?.frequency ?? "monthly"}
                  onChange={(event) => {
                    const nextFrequency = event.target.value;
                    const currentType = recurringForm?.type ?? "expense";
                    if (nextFrequency === "semi_monthly" && currentType !== "income") {
                      onRecurringFormChange?.("frequency", "monthly");
                      return;
                    }
                    onRecurringFormChange?.("frequency", nextFrequency);
                    if (nextFrequency === "semi_monthly") {
                      if (!String(recurringForm?.semi_monthly_day_1 ?? "").trim()) {
                        onRecurringFormChange?.("semi_monthly_day_1", "15");
                      }
                      if (!String(recurringForm?.semi_monthly_day_2 ?? "").trim()) {
                        onRecurringFormChange?.("semi_monthly_day_2", "30");
                      }
                    }
                  }}
                >
                  {recurringFrequencyOptionsForType(
                    recurringForm?.type ?? "expense"
                  ).map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {recurringFrequencyLabel(frequency)}
                    </option>
                  ))}
                </select>
              </label>
              {(recurringForm?.type ?? "expense") === "income" &&
                (recurringForm?.frequency ?? "monthly") === "semi_monthly" && (
                  <>
                    <label className="stack-fields">
                      <span className="subtle-text subtle-text-flush">Cutoff Day 1</span>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        inputMode="numeric"
                        value={recurringForm?.semi_monthly_day_1 ?? "15"}
                        onChange={(event) =>
                          onRecurringFormChange?.("semi_monthly_day_1", event.target.value)
                        }
                        required
                      />
                    </label>
                    <label className="stack-fields">
                      <span className="subtle-text subtle-text-flush">Cutoff Day 2</span>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        inputMode="numeric"
                        value={recurringForm?.semi_monthly_day_2 ?? "30"}
                        onChange={(event) =>
                          onRecurringFormChange?.("semi_monthly_day_2", event.target.value)
                        }
                        required
                      />
                    </label>
                  </>
                )}
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Next Due</span>
                <input
                  type="date"
                  value={recurringForm?.next_due_date ?? ""}
                  onChange={(event) =>
                    onRecurringFormChange?.("next_due_date", event.target.value)
                  }
                  required
                />
              </label>
              {addRecurringDrawerError && (
                <p className="subtle-text subtle-text-error subtle-text-flush">
                  {addRecurringDrawerError}
                </p>
              )}
              <div className="recurring-drawer-actions">
                <Button type="submit" size="sm" disabled={isAddRecurringDrawerSubmitting}>
                  {isAddRecurringDrawerSubmitting ? "Adding..." : "Add recurring"}
                </Button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
