import React from "react";
import { formatAmountInput } from "../utils/format";
import RowActionsMenu from "./RowActionsMenu";
import Button from "./ui/Button";

export default function RightPanelIncomeView({
  incomeAccountOptions = [],
  defaultIncomeAccountOption = null,
  openAddIncomeDrawer,
  incomeMonth,
  onIncomeMonthChange,
  incomeMonths,
  monthLabel,
  incomeCategoryFilter,
  onIncomeCategoryFilterChange,
  incomeCategoryOptions,
  formatMoney,
  incomeTotal,
  filteredIncome,
  activeIncomeId,
  openIncomeDrawer,
  handleIncomeRowKeyDown,
  onIncomeCategoryUpdate,
  getIncomeCategoryBadgeStyle,
  activeIncomeItem,
  closeIncomeDrawer,
  isIncomeDrawerSubmitting,
  handleIncomeDrawerSubmit,
  activeIncomeDraft,
  updateIncomeDraft,
  incomeDrawerError,
  handleIncomeDrawerDelete,
  isAddIncomeDrawerOpen,
  closeAddIncomeDrawer,
  isAddIncomeDrawerSubmitting,
  handleAddIncomeDrawerSubmit,
  incomeForm,
  onIncomeFormChange,
  addIncomeDrawerError,
}) {
  return (
    <>
      <section>
        <div className="income-header-row">
          <h2>Income</h2>
          <div className="section-header-actions">
            <Button
              type="button"
              size="sm"
              className="income-add-button"
              onClick={openAddIncomeDrawer}
            >
              Add income
            </Button>
          </div>
        </div>

        <div className="filter-row">
          <div className="filters">
            <select value={incomeMonth} onChange={onIncomeMonthChange}>
              {incomeMonths.map((month) => (
                <option key={month} value={month}>
                  {monthLabel(month)}
                </option>
              ))}
            </select>
            <select value={incomeCategoryFilter} onChange={onIncomeCategoryFilterChange}>
              <option value="">All Categories</option>
              {incomeCategoryOptions.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <p className="total-right">Total: {formatMoney(incomeTotal)}</p>
        </div>
        {filteredIncome.length === 0 ? (
          <p className="empty-state">No income found for this filter.</p>
        ) : (
          <>
            <p className="subtle-text subtle-text-flush recurring-table-hint">
              Click a row to edit.
            </p>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th className="cell-left">Date</th>
                    <th>Source</th>
                    <th>Category</th>
                    <th className="cell-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncome.map((item) => (
                    <tr
                      key={`income-${item.id}`}
                      className={`income-row${item.id === activeIncomeId ? " income-row-active" : ""}`}
                      onClick={() => openIncomeDrawer(item.id)}
                      onKeyDown={(event) => handleIncomeRowKeyDown(event, item.id)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Edit income from ${item.source}`}
                    >
                      <td className="cell-left">{item.received_date}</td>
                      <td>{item.source}</td>
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
                                item.income_category_id === null ||
                                item.income_category_id === undefined
                                  ? "✓ "
                                  : ""
                              }Uncategorized`,
                              onClick: () => onIncomeCategoryUpdate?.(item.id, null),
                            },
                            ...incomeCategoryOptions.map((category) => ({
                              label: `${item.income_category_id === category.id ? "✓ " : ""}${category.name}`,
                              onClick: () => onIncomeCategoryUpdate?.(item.id, category.id),
                            })),
                          ]}
                          renderTrigger={({ open, setOpen, buttonRef }) => (
                            <button
                              ref={buttonRef}
                              type="button"
                              className={`expense-category-badge${open ? " open" : ""}`}
                              style={getIncomeCategoryBadgeStyle(
                                item.income_category_id,
                                item.income_category_name
                              )}
                              aria-haspopup="menu"
                              aria-expanded={open}
                              aria-label={`Change category for ${item.source}`}
                              onClick={() => setOpen((prev) => !prev)}
                            >
                              <span className="expense-category-badge-label">
                                {item.income_category_name || "Uncategorized"}
                              </span>
                              <span className="expense-category-badge-caret">▾</span>
                            </button>
                          )}
                        />
                      </td>
                      <td className="cell-right">{formatMoney(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      {activeIncomeItem && (
        <div className="side-drawer-backdrop" onClick={closeIncomeDrawer}>
          <aside
            className="side-drawer income-edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Edit income"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2>Edit Income</h2>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={closeIncomeDrawer}
                disabled={isIncomeDrawerSubmitting}
              >
                Close
              </Button>
            </div>
            <form onSubmit={handleIncomeDrawerSubmit} className="recurring-drawer-form">
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={
                    activeIncomeDraft?.amount ??
                    formatAmountInput(String(activeIncomeItem.amount ?? ""))
                  }
                  onChange={(event) =>
                    updateIncomeDraft(activeIncomeItem.id, "amount", event.target.value)
                  }
                  required
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Source</span>
                <input
                  type="text"
                  value={activeIncomeDraft?.source ?? activeIncomeItem.source}
                  onChange={(event) =>
                    updateIncomeDraft(activeIncomeItem.id, "source", event.target.value)
                  }
                  required
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Category</span>
                <select
                  value={
                    activeIncomeDraft?.income_category_id ??
                    (activeIncomeItem.income_category_id === null ||
                    activeIncomeItem.income_category_id === undefined
                      ? ""
                      : String(activeIncomeItem.income_category_id))
                  }
                  onChange={(event) =>
                    updateIncomeDraft(
                      activeIncomeItem.id,
                      "income_category_id",
                      event.target.value
                    )
                  }
                >
                  <option value="">Uncategorized</option>
                  {incomeCategoryOptions.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Date</span>
                <input
                  type="date"
                  value={activeIncomeDraft?.received_date ?? activeIncomeItem.received_date}
                  onChange={(event) =>
                    updateIncomeDraft(activeIncomeItem.id, "received_date", event.target.value)
                  }
                  required
                />
              </label>
              {incomeDrawerError && (
                <p className="subtle-text subtle-text-error subtle-text-flush">
                  {incomeDrawerError}
                </p>
              )}
              <div className="income-drawer-actions">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="income-drawer-remove-button"
                  onClick={handleIncomeDrawerDelete}
                  disabled={isIncomeDrawerSubmitting}
                >
                  Remove
                </Button>
                <div className="expense-drawer-right-actions">
                  <Button type="submit" size="sm" disabled={isIncomeDrawerSubmitting}>
                    {isIncomeDrawerSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      )}
      {isAddIncomeDrawerOpen && (
        <div className="side-drawer-backdrop" onClick={closeAddIncomeDrawer}>
          <aside
            className="side-drawer income-edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Add income"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2>Add Income</h2>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={closeAddIncomeDrawer}
                disabled={isAddIncomeDrawerSubmitting}
              >
                Close
              </Button>
            </div>
            <form onSubmit={handleAddIncomeDrawerSubmit} className="recurring-drawer-form">
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={incomeForm?.amount ?? ""}
                  onChange={(event) => onIncomeFormChange?.("amount", event.target.value)}
                  required
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Source</span>
                <input
                  type="text"
                  value={incomeForm?.source ?? ""}
                  onChange={(event) => onIncomeFormChange?.("source", event.target.value)}
                  required
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Account</span>
                <select
                  value={incomeForm?.to_account_id ?? ""}
                  onChange={(event) =>
                    onIncomeFormChange?.("to_account_id", event.target.value)
                  }
                >
                  {defaultIncomeAccountOption ? null : (
                    <option value="">Select Account</option>
                  )}
                  {incomeAccountOptions.map((account) => (
                    <option
                      key={`add-income-account-${account.id}`}
                      value={String(account.id)}
                    >
                      {account.name}
                      {account.currency_code ? ` (${account.currency_code})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Category</span>
                <select
                  value={incomeForm?.income_category_id ?? ""}
                  onChange={(event) =>
                    onIncomeFormChange?.(
                      "income_category_id",
                      event.target.value === "" ? "" : Number(event.target.value)
                    )
                  }
                >
                  <option value="">Uncategorized</option>
                  {incomeCategoryOptions.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Date</span>
                <input
                  type="date"
                  value={incomeForm?.received_date ?? ""}
                  onChange={(event) => onIncomeFormChange?.("received_date", event.target.value)}
                  required
                />
              </label>
              {addIncomeDrawerError && (
                <p className="subtle-text subtle-text-error subtle-text-flush">
                  {addIncomeDrawerError}
                </p>
              )}
              <div className="income-drawer-actions">
                <div className="expense-drawer-right-actions">
                  <Button type="submit" size="sm" disabled={isAddIncomeDrawerSubmitting}>
                    {isAddIncomeDrawerSubmitting ? "Adding..." : "Add Income"}
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
