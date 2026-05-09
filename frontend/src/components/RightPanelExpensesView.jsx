import React from "react";
import { formatAmountInput } from "../utils/format";
import RowActionsMenu from "./RowActionsMenu";
import Button from "./ui/Button";
import SortIconButton from "./ui/SortIconButton";

export default function RightPanelExpensesView({
  accounts = [],
  expenseAccountOptions = [],
  defaultExpenseAccountOption = null,
  EXPENSE_EXPECTATION_OPTIONS,
  normalizeExpenseExpectation,
  expenseExpectationLabel,
  openAddExpenseDrawer,
  expenseMonth,
  onExpenseMonthChange,
  expenseMonths,
  monthLabel,
  expenseCategoryFilter,
  onExpenseCategoryFilterChange,
  expenseCategoryOptions,
  expenseDateFrom,
  onExpenseDateFromChange,
  expenseDateTo,
  onExpenseDateToChange,
  formatMoney,
  expenseTotal,
  sortedExpenses,
  expenseSort,
  onToggleExpenseSort,
  activeExpenseId,
  openExpenseDrawer,
  handleExpenseRowKeyDown,
  onExpenseExpectationUpdate,
  onExpenseCategoryUpdate,
  getExpenseCategoryBadgeStyle,
  activeExpenseItem,
  closeExpenseDrawer,
  isExpenseDrawerSubmitting,
  handleExpenseDrawerSubmit,
  activeExpenseDraft,
  updateExpenseDraft,
  expenseDrawerError,
  handleExpenseDrawerDelete,
  handleExpenseDrawerMarkRecurring,
  isAddExpenseDrawerOpen,
  closeAddExpenseDrawer,
  isAddExpenseDrawerSubmitting,
  handleAddExpenseDrawerSubmit,
  addExpenseSuggestions,
  suggestionKey,
  applyAddExpenseSuggestion,
  expenseForm,
  onExpenseFormChange,
  addExpenseDrawerError,
}) {
  const activeExpenseAccountOptions = React.useMemo(() => {
    if (!activeExpenseItem?.entity_id) {
      return Array.isArray(accounts) ? accounts : [];
    }
    return (Array.isArray(accounts) ? accounts : []).filter(
      (account) => String(account?.entity_id || "") === String(activeExpenseItem.entity_id)
    );
  }, [accounts, activeExpenseItem?.entity_id]);
  const activeExpenseAccountValue =
    activeExpenseDraft?.from_account_id ??
    (activeExpenseItem?.from_account_id === null ||
    activeExpenseItem?.from_account_id === undefined
      ? ""
      : String(activeExpenseItem.from_account_id));

  return (
    <>
      <section>
        <div className="expense-header-row">
          <h2>Expense List</h2>
          <div className="section-header-actions">
            <Button
              type="button"
              size="sm"
              className="expense-add-button"
              onClick={openAddExpenseDrawer}
            >
              Add expense
            </Button>
          </div>
        </div>
        <div className="filter-row">
          <div className="filters">
            <select value={expenseMonth} onChange={onExpenseMonthChange}>
              <option value="">All Months</option>
              {expenseMonths.map((month) => (
                <option key={month} value={month}>
                  {monthLabel(month)}
                </option>
              ))}
            </select>
            <select value={expenseCategoryFilter} onChange={onExpenseCategoryFilterChange}>
              <option value="">All Categories</option>
              {expenseCategoryOptions.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={expenseDateFrom}
              onChange={onExpenseDateFromChange}
              aria-label="Expense date from"
            />
            <input
              type="date"
              value={expenseDateTo}
              onChange={onExpenseDateToChange}
              aria-label="Expense date to"
            />
          </div>
          <p className="total-right">Total: {formatMoney(expenseTotal)}</p>
        </div>
        {sortedExpenses.length === 0 ? (
          <p className="empty-state">No expenses found for this filter.</p>
        ) : (
          <>
            <p className="subtle-text subtle-text-flush recurring-table-hint">
              Click a row to edit.
            </p>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th className="cell-left">
                      Date{" "}
                      <SortIconButton
                        onClick={() => onToggleExpenseSort("spent_at")}
                        active={expenseSort.column === "spent_at"}
                        direction={expenseSort.direction}
                        aria-label="Sort by date"
                      />
                    </th>
                    <th className="expense-amount-column">
                      Amount{" "}
                      <SortIconButton
                        onClick={() => onToggleExpenseSort("amount")}
                        active={expenseSort.column === "amount"}
                        direction={expenseSort.direction}
                        aria-label="Sort by amount"
                      />
                    </th>
                    <th>
                      Name{" "}
                      <SortIconButton
                        onClick={() => onToggleExpenseSort("name")}
                        active={expenseSort.column === "name"}
                        direction={expenseSort.direction}
                        aria-label="Sort by name"
                      />
                    </th>
                    <th className="expense-expectation-column">Expectation</th>
                    <th>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedExpenses.map((item) => (
                    <tr
                      key={`expense-${item.id}`}
                      className={`expense-row${item.id === activeExpenseId ? " expense-row-active" : ""}`}
                      onClick={() => openExpenseDrawer(item.id)}
                      onKeyDown={(event) => handleExpenseRowKeyDown(event, item.id)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Edit expense ${item.name}`}
                    >
                      <td className="cell-left">{item.spent_at}</td>
                      <td className="expense-amount-column">{formatMoney(item.amount)}</td>
                      <td>{item.name}</td>
                      <td
                        className="expense-category-cell expense-expectation-column"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <RowActionsMenu
                          align="left"
                          menuClassName="expense-category-dropdown"
                          itemClassName="expense-category-dropdown-item"
                          actions={EXPENSE_EXPECTATION_OPTIONS.map((option) => ({
                            label: `${
                              normalizeExpenseExpectation(item.expense_expectation) === option.value
                                ? "✓ "
                                : ""
                            }${option.label}`,
                            onClick: () => onExpenseExpectationUpdate?.(item.id, option.value),
                          }))}
                          renderTrigger={({ open, setOpen, buttonRef }) => (
                            <button
                              ref={buttonRef}
                              type="button"
                              className={`expense-expectation-badge${open ? " open" : ""} ${normalizeExpenseExpectation(item.expense_expectation)}`}
                              aria-haspopup="menu"
                              aria-expanded={open}
                              aria-label={`Change expectation for ${item.name}`}
                              onClick={() => setOpen((prev) => !prev)}
                            >
                              <span className="expense-category-badge-label">
                                {expenseExpectationLabel(item.expense_expectation)}
                              </span>
                              <span className="expense-category-badge-caret">▾</span>
                            </button>
                          )}
                        />
                      </td>
                      <td
                        className="expense-category-cell"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <RowActionsMenu
                          align="left"
                          menuClassName="expense-category-dropdown"
                          itemClassName="expense-category-dropdown-item"
                          actions={[
                            {
                              label: `${
                                item.expense_category_id === null ||
                                item.expense_category_id === undefined
                                  ? "✓ "
                                  : ""
                              }Uncategorized`,
                              onClick: () => onExpenseCategoryUpdate?.(item.id, null),
                            },
                            ...expenseCategoryOptions.map((category) => ({
                              label: `${item.expense_category_id === category.id ? "✓ " : ""}${category.name}`,
                              onClick: () => onExpenseCategoryUpdate?.(item.id, category.id),
                            })),
                          ]}
                          renderTrigger={({ open, setOpen, buttonRef }) => (
                            <button
                              ref={buttonRef}
                              type="button"
                              className={`expense-category-badge${open ? " open" : ""}`}
                              style={getExpenseCategoryBadgeStyle(
                                item.expense_category_id,
                                item.expense_category_name
                              )}
                              aria-haspopup="menu"
                              aria-expanded={open}
                              aria-label={`Change category for ${item.name}`}
                              onClick={() => setOpen((prev) => !prev)}
                            >
                              <span className="expense-category-badge-label">
                                {item.expense_category_name || "Uncategorized"}
                              </span>
                              <span className="expense-category-badge-caret">▾</span>
                            </button>
                          )}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      {activeExpenseItem && (
        <div className="side-drawer-backdrop" onClick={closeExpenseDrawer}>
          <aside
            className="side-drawer expense-edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Edit expense"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2>Edit Expense</h2>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={closeExpenseDrawer}
                disabled={isExpenseDrawerSubmitting}
              >
                Close
              </Button>
            </div>
            <form onSubmit={handleExpenseDrawerSubmit} className="recurring-drawer-form">
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Date</span>
                <input
                  type="date"
                  value={activeExpenseDraft?.spent_at ?? activeExpenseItem.spent_at}
                  onChange={(event) =>
                    updateExpenseDraft(activeExpenseItem.id, "spent_at", event.target.value)
                  }
                  required
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Name</span>
                <input
                  type="text"
                  value={activeExpenseDraft?.name ?? activeExpenseItem.name}
                  onChange={(event) =>
                    updateExpenseDraft(activeExpenseItem.id, "name", event.target.value)
                  }
                  required
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Account</span>
                <select
                  value={activeExpenseAccountValue}
                  onChange={(event) =>
                    updateExpenseDraft(
                      activeExpenseItem.id,
                      "from_account_id",
                      event.target.value
                    )
                  }
                >
                  {activeExpenseAccountValue ? null : (
                    <option value="">No recorded account</option>
                  )}
                  {activeExpenseAccountOptions.map((account) => (
                    <option key={`expense-account-${account.id}`} value={String(account.id)}>
                      {account.name}
                      {account.currency_code ? ` (${account.currency_code})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Expectation</span>
                <select
                  value={
                    activeExpenseDraft?.expense_expectation ??
                    normalizeExpenseExpectation(activeExpenseItem.expense_expectation)
                  }
                  onChange={(event) =>
                    updateExpenseDraft(
                      activeExpenseItem.id,
                      "expense_expectation",
                      normalizeExpenseExpectation(event.target.value)
                    )
                  }
                >
                  {EXPENSE_EXPECTATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Category</span>
                <select
                  value={
                    activeExpenseDraft?.expense_category_id ??
                    (activeExpenseItem.expense_category_id === null ||
                    activeExpenseItem.expense_category_id === undefined
                      ? ""
                      : String(activeExpenseItem.expense_category_id))
                  }
                  onChange={(event) =>
                    updateExpenseDraft(
                      activeExpenseItem.id,
                      "expense_category_id",
                      event.target.value
                    )
                  }
                >
                  <option value="">Uncategorized</option>
                  {expenseCategoryOptions.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={
                    activeExpenseDraft?.amount ??
                    formatAmountInput(String(activeExpenseItem.amount ?? ""))
                  }
                  onChange={(event) =>
                    updateExpenseDraft(activeExpenseItem.id, "amount", event.target.value)
                  }
                  required
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Notes (optional)</span>
                <input
                  type="text"
                  value={activeExpenseDraft?.notes ?? activeExpenseItem.notes ?? ""}
                  onChange={(event) =>
                    updateExpenseDraft(activeExpenseItem.id, "notes", event.target.value)
                  }
                />
              </label>
              {expenseDrawerError && (
                <p className="subtle-text subtle-text-error subtle-text-flush">
                  {expenseDrawerError}
                </p>
              )}
              <div className="expense-drawer-actions">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="expense-drawer-remove-button"
                  onClick={handleExpenseDrawerDelete}
                  disabled={isExpenseDrawerSubmitting}
                >
                  Remove
                </Button>
                <div className="expense-drawer-right-actions">
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={handleExpenseDrawerMarkRecurring}
                    disabled={isExpenseDrawerSubmitting}
                  >
                    Make recurring
                  </Button>
                  <Button type="submit" size="sm" disabled={isExpenseDrawerSubmitting}>
                    {isExpenseDrawerSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      )}
      {isAddExpenseDrawerOpen && (
        <div className="side-drawer-backdrop" onClick={closeAddExpenseDrawer}>
          <aside
            className="side-drawer expense-edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Add expense"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2>Add Expense</h2>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={closeAddExpenseDrawer}
                disabled={isAddExpenseDrawerSubmitting}
              >
                Close
              </Button>
            </div>
            <form onSubmit={handleAddExpenseDrawerSubmit} className="recurring-drawer-form">
              {addExpenseSuggestions.length > 0 && (
                <div className="stack-fields">
                  <span className="subtle-text subtle-text-flush">Suggestions</span>
                  <div className="loan-origin-badge-group">
                    {addExpenseSuggestions.map((item) => (
                      <Button
                        key={`add-expense-suggestion-${suggestionKey(item)}`}
                        type="button"
                        variant="subtle"
                        size="sm"
                        className="loan-origin-badge"
                        onClick={() => applyAddExpenseSuggestion(item)}
                      >
                        {item.expense_category_name
                          ? `${item.expense_category_name} - ${item.category}`
                          : item.category}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={expenseForm?.amount ?? ""}
                  onChange={(event) => onExpenseFormChange?.("amount", event.target.value)}
                  required
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Name</span>
                <input
                  type="text"
                  value={expenseForm?.name ?? ""}
                  onChange={(event) => onExpenseFormChange?.("name", event.target.value)}
                  required
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Account</span>
                <select
                  value={expenseForm?.from_account_id ?? ""}
                  onChange={(event) =>
                    onExpenseFormChange?.("from_account_id", event.target.value)
                  }
                >
                  {defaultExpenseAccountOption ? null : (
                    <option value="">Select Account</option>
                  )}
                  {expenseAccountOptions.map((account) => (
                    <option
                      key={`add-expense-account-${account.id}`}
                      value={String(account.id)}
                    >
                      {account.name}
                      {account.currency_code ? ` (${account.currency_code})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Expectation</span>
                <select
                  value={expenseForm?.expense_expectation ?? "unexpected"}
                  onChange={(event) =>
                    onExpenseFormChange?.(
                      "expense_expectation",
                      normalizeExpenseExpectation(event.target.value)
                    )
                  }
                >
                  {EXPENSE_EXPECTATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Category</span>
                <select
                  value={expenseForm?.expense_category_id ?? ""}
                  onChange={(event) =>
                    onExpenseFormChange?.(
                      "expense_category_id",
                      event.target.value === "" ? "" : Number(event.target.value)
                    )
                  }
                >
                  <option value="">Uncategorized</option>
                  {expenseCategoryOptions.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Notes (optional)</span>
                <input
                  type="text"
                  value={expenseForm?.notes ?? ""}
                  onChange={(event) => onExpenseFormChange?.("notes", event.target.value)}
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Date</span>
                <input
                  type="date"
                  value={expenseForm?.spent_at ?? ""}
                  onChange={(event) => onExpenseFormChange?.("spent_at", event.target.value)}
                  required
                />
              </label>
              {addExpenseDrawerError && (
                <p className="subtle-text subtle-text-error subtle-text-flush">
                  {addExpenseDrawerError}
                </p>
              )}
              <div className="expense-drawer-actions">
                <div className="expense-drawer-right-actions">
                  <Button type="submit" size="sm" disabled={isAddExpenseDrawerSubmitting}>
                    {isAddExpenseDrawerSubmitting ? "Adding..." : "Add Expense"}
                  </Button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
