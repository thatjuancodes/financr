import React from "react";
import RowActionsMenu from "./RowActionsMenu";
import Button from "./ui/Button";
import SortIconButton from "./ui/SortIconButton";
import { monthLabel, formatAmountInput } from "../utils/format";

export default function RightPanelDebtView({
  debtBulkAction,
  setDebtBulkAction,
  groupedDebts,
  openAddDebtDrawer,
  openImportDebtDrawer,
  debtMonth,
  onDebtMonthChange,
  debtMonths,
  debtCategoryFilter,
  onDebtCategoryFilterChange,
  debtCategoryOptions,
  formatMoney,
  debtTotal,
  selectedFilteredDebtCount,
  onDeleteSelectedDebts,
  statementLabel,
  debtCycleMonth,
  debtStatementCycleTotals,
  getDebtRemainingDaysLabel,
  expandedDebtGroups,
  toggleDebtGroup,
  handleDebtGroupRowKeyDown,
  onPayoffLoanOrigin,
  openDebtPayoffModal,
  debtSelectAllRef,
  allVisibleDebtsSelected,
  visibleDebtIds,
  onDebtSelectAllChange,
  debtSort,
  onToggleDebtSort,
  activeDebtId,
  openDebtDrawer,
  handleDebtRowKeyDown,
  selectedDebtIdSet,
  onDebtRowSelectionChange,
  onDebtCategoryUpdate,
  getDebtCategoryBadgeStyle,
  activeDebtItem,
  closeDebtDrawer,
  isDebtDrawerSubmitting,
  handleDebtDrawerSubmit,
  activeDebtDraft,
  updateDebtDraft,
  loanOriginOptions,
  debtDrawerError,
  handleDebtDrawerDelete,
  isAddDebtDrawerOpen,
  closeAddDebtDrawer,
  isAddDebtDrawerSubmitting,
  handleAddDebtDrawerSubmit,
  debtOrigins,
  onDebtOriginSuggestionSelect,
  onDebtFormChange,
  debtForm,
  addDebtDrawerError,
  isImportDebtDrawerOpen,
  closeImportDebtDrawer,
  isDebtCsvImporting,
  handleDebtCsvImportSubmit,
  handleDebtCsvFileChange,
  debtCsvDefaultLoanOrigin,
  setDebtCsvDefaultLoanOrigin,
  debtCsvDefaultCategoryId,
  setDebtCsvDefaultCategoryId,
  debtCsvFileName,
  debtCsvImportError,
  debtCsvText,
  debtPayoffModal,
  closeDebtPayoffModal,
  isDebtPayoffSubmitting,
  debtPayoffForm,
  setDebtPayoffForm,
  debtPayoffError,
  handleDebtPayoffSubmit,
}) {
  const canApplyDelete = debtBulkAction === "delete";
  const hasAnyDebtRows = groupedDebts.some((group) => group.rows.length > 0);

  return (
    <>
      <section>
        <div className="debt-header-row">
          <h2>Debt</h2>
          <div className="section-header-actions debt-header-actions">
            <Button
              type="button"
              size="sm"
              className="debt-add-button"
              onClick={openAddDebtDrawer}
            >
              Add debt
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="debt-import-button"
              onClick={openImportDebtDrawer}
            >
              Import
            </Button>
          </div>
        </div>
        <div className="filter-row">
          <div className="filters">
            <select value={debtMonth} onChange={onDebtMonthChange}>
              {debtMonths.map((month) => (
                <option key={month} value={month}>
                  {monthLabel(month)}
                </option>
              ))}
            </select>
            <select value={debtCategoryFilter} onChange={onDebtCategoryFilterChange}>
              <option value="">All Categories</option>
              {debtCategoryOptions.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <p className="total-right">Total: {formatMoney(debtTotal)}</p>
            {selectedFilteredDebtCount > 1 && (
              <>
                <select
                  value={debtBulkAction}
                  onChange={(event) => setDebtBulkAction(event.target.value)}
                  className="select"
                >
                  <option value="">Bulk Actions</option>
                  <option value="delete">
                    Delete Selected ({selectedFilteredDebtCount})
                  </option>
                </select>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={onDeleteSelectedDebts}
                  disabled={!canApplyDelete}
                >
                  Apply
                </Button>
              </>
            )}
          </div>
        </div>
        <p className="subtle-text">Statement: {statementLabel(debtCycleMonth)}</p>
        {debtStatementCycleTotals.length > 0 && (
          <div className="table-scroll">
            <table className="table debt-cycle-table">
              <colgroup>
                <col className="debt-select-column" />
                <col className="debt-date-column" />
                <col className="debt-due-column" />
                <col className="debt-amount-column" />
                <col className="debt-name-column" />
                <col className="debt-category-column" />
                <col className="debt-action-column" />
              </colgroup>
              <thead>
                <tr>
                  <th className="debt-select-column" aria-hidden="true" />
                  <th className="debt-date-column">Statement</th>
                  <th className="debt-due-column">Remaining Days</th>
                  <th className="debt-amount-column">Total</th>
                  <th className="cell-left debt-name-column">Loan Origin</th>
                  <th className="debt-category-column">Transactions</th>
                  <th className="debt-action-column" aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {debtStatementCycleTotals.map((row) => (
                  <tr key={`debt-cycle-total-${row.loan_origin}`}>
                    <td className="debt-select-column" aria-hidden="true" />
                    <td className="debt-date-column">
                      {statementLabel(row.statement_month || debtCycleMonth)}
                    </td>
                    <td className="debt-due-column">
                      {getDebtRemainingDaysLabel(
                        row.loan_origin,
                        row.statement_month || debtCycleMonth
                      )}
                    </td>
                    <td className="debt-amount-column">{formatMoney(row.total)}</td>
                    <td className="cell-left debt-name-column">{row.loan_origin}</td>
                    <td className="debt-category-column">{row.count}</td>
                    <td className="debt-action-column" aria-hidden="true" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hasAnyDebtRows ? (
          <>
            <p className="subtle-text subtle-text-flush recurring-table-hint">
              Click a row to edit.
            </p>
            <div className="table-scroll">
              <table className="table debt-table">
                <colgroup>
                  <col className="debt-select-column" />
                  <col className="debt-date-column" />
                  <col className="debt-amount-column" />
                  <col className="debt-name-column" />
                  <col className="debt-category-column" />
                  <col className="debt-action-column" />
                </colgroup>
                <tbody>
                  {groupedDebts.map((group, groupIndex) => {
                    const isGroupExpanded = expandedDebtGroups[group.loanOrigin] !== false;
                    return (
                      <React.Fragment key={`debt-group-${group.loanOrigin}`}>
                        <tr
                          className="debt-group-row"
                          onClick={() => toggleDebtGroup(group.loanOrigin)}
                          onKeyDown={(event) =>
                            handleDebtGroupRowKeyDown(event, group.loanOrigin)
                          }
                          role="button"
                          tabIndex={0}
                          aria-expanded={isGroupExpanded}
                          aria-label={`${
                            isGroupExpanded ? "Collapse" : "Expand"
                          } ${group.loanOrigin}`}
                        >
                          <td className="cell-left debt-group-indicator-cell debt-select-column">
                            <span className="debt-group-chevron" aria-hidden="true">
                              {isGroupExpanded ? "▾" : "▸"}
                            </span>
                          </td>
                          <td className="cell-left debt-group-title-cell">
                            <strong>{group.loanOrigin}</strong>
                          </td>
                          <td className="debt-group-metric-cell">
                            <span className="debt-group-metric-label">Amount</span>
                            <span className="debt-group-metric-value">
                              {formatMoney(group.amountTotal)}
                            </span>
                          </td>
                          <td className="debt-group-metric-cell">
                            <span className="debt-group-metric-label">Paid</span>
                            <span className="debt-group-metric-value">
                              {formatMoney(group.totalPaid)}
                            </span>
                          </td>
                          <td className="debt-group-metric-cell">
                            <span className="debt-group-metric-label">Balance</span>
                            <span className="debt-group-metric-value">
                              {formatMoney(group.balance)}
                            </span>
                          </td>
                          <td className="debt-group-action-cell debt-action-column">
                            {onPayoffLoanOrigin &&
                              group.loanOrigin !== "Unassigned" &&
                              Number(group.balance) > 0 && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="debt-group-payoff-button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openDebtPayoffModal(group);
                                  }}
                                  onKeyDown={(event) => event.stopPropagation()}
                                >
                                  Pay Off
                                </Button>
                              )}
                          </td>
                        </tr>
                        {isGroupExpanded && (
                          <tr className="debt-group-column-row">
                            <th className="cell-left debt-select-column">
                              <input
                                ref={groupIndex === 0 ? debtSelectAllRef : undefined}
                                type="checkbox"
                                aria-label="Select all visible debt rows"
                                checked={allVisibleDebtsSelected}
                                disabled={visibleDebtIds.length === 0}
                                onChange={(event) =>
                                  onDebtSelectAllChange(event.target.checked, visibleDebtIds)
                                }
                              />
                            </th>
                            <th className="cell-left debt-date-column">
                              Date{" "}
                              <SortIconButton
                                onClick={() => onToggleDebtSort("spent_at")}
                                active={debtSort.column === "spent_at"}
                                direction={debtSort.direction}
                                aria-label="Sort by date"
                              />
                            </th>
                            <th className="debt-amount-column">
                              Amount{" "}
                              <SortIconButton
                                onClick={() => onToggleDebtSort("amount")}
                                active={debtSort.column === "amount"}
                                direction={debtSort.direction}
                                aria-label="Sort by amount"
                              />
                            </th>
                            <th className="debt-name-column">
                              Name{" "}
                              <SortIconButton
                                onClick={() => onToggleDebtSort("name")}
                                active={debtSort.column === "name"}
                                direction={debtSort.direction}
                                aria-label="Sort by name"
                              />
                            </th>
                            <th className="debt-category-column">Category</th>
                            <th
                              className="debt-group-action-header debt-action-column"
                              aria-hidden="true"
                            />
                          </tr>
                        )}
                        {isGroupExpanded &&
                          group.rows.map((item) => (
                            <tr
                              key={`debt-${item.id}`}
                              className={`debt-row${
                                item.id === activeDebtId ? " debt-row-active" : ""
                              }`}
                              onClick={() => openDebtDrawer(item.id)}
                              onKeyDown={(event) => handleDebtRowKeyDown(event, item.id)}
                              role="button"
                              tabIndex={0}
                              aria-label={`Edit debt ${item.name}`}
                            >
                              <td
                                className="cell-left debt-select-column"
                                onClick={(event) => event.stopPropagation()}
                                onKeyDown={(event) => event.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  aria-label={`Select debt row ${item.name}`}
                                  checked={selectedDebtIdSet.has(item.id)}
                                  onChange={(event) =>
                                    onDebtRowSelectionChange(item.id, event.target.checked)
                                  }
                                />
                              </td>
                              <td className="cell-left debt-date-column">{item.spent_at}</td>
                              <td className="debt-amount-column">{formatMoney(item.amount)}</td>
                              <td className="debt-name-column">{item.name}</td>
                              <td
                                className="expense-category-cell debt-category-column"
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
                                        item.debt_category_id === null ||
                                        item.debt_category_id === undefined
                                          ? "✓ "
                                          : ""
                                      }Uncategorized`,
                                      onClick: () => onDebtCategoryUpdate?.(item.id, null),
                                    },
                                    ...debtCategoryOptions.map((category) => ({
                                      label: `${
                                        item.debt_category_id === category.id ? "✓ " : ""
                                      }${category.name}`,
                                      onClick: () =>
                                        onDebtCategoryUpdate?.(item.id, category.id),
                                    })),
                                  ]}
                                  renderTrigger={({ open, setOpen, buttonRef }) => (
                                    <button
                                      ref={buttonRef}
                                      type="button"
                                      className={`expense-category-badge${open ? " open" : ""}`}
                                      style={getDebtCategoryBadgeStyle(
                                        item.debt_category_id,
                                        item.debt_category_name
                                      )}
                                      aria-haspopup="menu"
                                      aria-expanded={open}
                                      aria-label={`Change debt category for ${item.name}`}
                                      onClick={() => setOpen((prev) => !prev)}
                                    >
                                      <span className="expense-category-badge-label">
                                        {item.debt_category_name || "Uncategorized"}
                                      </span>
                                      <span className="expense-category-badge-caret">▾</span>
                                    </button>
                                  )}
                                />
                              </td>
                              <td
                                className="debt-row-action-spacer debt-action-column"
                                aria-hidden="true"
                              />
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="empty-state">No debt records for this filter.</p>
        )}
      </section>
      {activeDebtItem && (
        <div className="side-drawer-backdrop" onClick={closeDebtDrawer}>
          <aside
            className="side-drawer debt-edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Edit debt"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2>Edit Debt</h2>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={closeDebtDrawer}
                disabled={isDebtDrawerSubmitting}
              >
                Close
              </Button>
            </div>
            <form onSubmit={handleDebtDrawerSubmit} className="recurring-drawer-form">
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={
                    activeDebtDraft?.amount ??
                    formatAmountInput(String(activeDebtItem.amount ?? ""))
                  }
                  onChange={(event) =>
                    updateDebtDraft(activeDebtItem.id, "amount", event.target.value)
                  }
                  required
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Name</span>
                <input
                  type="text"
                  value={activeDebtDraft?.name ?? activeDebtItem.name}
                  onChange={(event) =>
                    updateDebtDraft(activeDebtItem.id, "name", event.target.value)
                  }
                  required
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Loan Origin</span>
                <input
                  type="text"
                  value={activeDebtDraft?.loan_origin ?? activeDebtItem.loan_origin ?? ""}
                  onChange={(event) =>
                    updateDebtDraft(activeDebtItem.id, "loan_origin", event.target.value)
                  }
                  list="debt-origin-options-edit"
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Category</span>
                <select
                  value={
                    activeDebtDraft?.debt_category_id ??
                    (activeDebtItem.debt_category_id === null ||
                    activeDebtItem.debt_category_id === undefined
                      ? ""
                      : String(activeDebtItem.debt_category_id))
                  }
                  onChange={(event) =>
                    updateDebtDraft(activeDebtItem.id, "debt_category_id", event.target.value)
                  }
                >
                  <option value="">Uncategorized</option>
                  {debtCategoryOptions.map((category) => (
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
                  value={activeDebtDraft?.notes ?? activeDebtItem.notes ?? ""}
                  onChange={(event) =>
                    updateDebtDraft(activeDebtItem.id, "notes", event.target.value)
                  }
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Date</span>
                <input
                  type="date"
                  value={activeDebtDraft?.spent_at ?? activeDebtItem.spent_at}
                  onChange={(event) =>
                    updateDebtDraft(activeDebtItem.id, "spent_at", event.target.value)
                  }
                  required
                />
              </label>
              <datalist id="debt-origin-options-edit">
                {loanOriginOptions.map((origin) => (
                  <option key={`debt-origin-edit-${origin}`} value={origin} />
                ))}
              </datalist>
              {debtDrawerError && (
                <p className="subtle-text subtle-text-error subtle-text-flush">
                  {debtDrawerError}
                </p>
              )}
              <div className="debt-drawer-actions">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="debt-drawer-remove-button"
                  onClick={handleDebtDrawerDelete}
                  disabled={isDebtDrawerSubmitting}
                >
                  Remove
                </Button>
                <div className="expense-drawer-right-actions">
                  <Button type="submit" size="sm" disabled={isDebtDrawerSubmitting}>
                    {isDebtDrawerSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      )}
      {isAddDebtDrawerOpen && (
        <div className="side-drawer-backdrop" onClick={closeAddDebtDrawer}>
          <aside
            className="side-drawer debt-edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Add debt"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2>Add Debt</h2>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={closeAddDebtDrawer}
                disabled={isAddDebtDrawerSubmitting}
              >
                Close
              </Button>
            </div>
            <form onSubmit={handleAddDebtDrawerSubmit} className="recurring-drawer-form">
              {debtOrigins.length > 0 && (
                <div className="stack-fields">
                  <span className="subtle-text subtle-text-flush">
                    Loan Origin Suggestions
                  </span>
                  <div className="loan-origin-badge-group">
                    {debtOrigins.map((item) => (
                      <Button
                        key={`debt-origin-suggestion-${item.loan_origin}`}
                        type="button"
                        variant="subtle"
                        size="sm"
                        className="loan-origin-badge"
                        onClick={() => {
                          if (onDebtOriginSuggestionSelect) {
                            onDebtOriginSuggestionSelect(item);
                            return;
                          }
                          onDebtFormChange?.("loan_origin", item.loan_origin);
                        }}
                      >
                        {item.loan_origin}
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
                  value={debtForm?.amount ?? ""}
                  onChange={(event) => onDebtFormChange?.("amount", event.target.value)}
                  required
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Name</span>
                <input
                  type="text"
                  value={debtForm?.name ?? ""}
                  onChange={(event) => onDebtFormChange?.("name", event.target.value)}
                  required
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Loan Origin</span>
                <select
                  value={debtForm?.loan_origin ?? ""}
                  onChange={(event) => onDebtFormChange?.("loan_origin", event.target.value)}
                >
                  <option value="">Select Loan Origin</option>
                  {loanOriginOptions.map((origin) => (
                    <option key={`debt-origin-add-${origin}`} value={origin}>
                      {origin}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Category</span>
                <select
                  value={debtForm?.debt_category_id ?? ""}
                  onChange={(event) =>
                    onDebtFormChange?.(
                      "debt_category_id",
                      event.target.value === "" ? "" : Number(event.target.value)
                    )
                  }
                >
                  <option value="">Select Category</option>
                  {debtCategoryOptions.map((category) => (
                    <option key={`debt-category-add-${category.id}`} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Notes (optional)</span>
                <input
                  type="text"
                  value={debtForm?.notes ?? ""}
                  onChange={(event) => onDebtFormChange?.("notes", event.target.value)}
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Date</span>
                <input
                  type="date"
                  value={debtForm?.spent_at ?? ""}
                  onChange={(event) => onDebtFormChange?.("spent_at", event.target.value)}
                  required
                />
              </label>
              {addDebtDrawerError && (
                <p className="subtle-text subtle-text-error subtle-text-flush">
                  {addDebtDrawerError}
                </p>
              )}
              <div className="debt-drawer-actions">
                <div className="expense-drawer-right-actions">
                  <Button type="submit" size="sm" disabled={isAddDebtDrawerSubmitting}>
                    {isAddDebtDrawerSubmitting ? "Adding..." : "Add Debt"}
                  </Button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      )}
      {isImportDebtDrawerOpen && (
        <div className="side-drawer-backdrop" onClick={closeImportDebtDrawer}>
          <aside
            className="side-drawer debt-edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Import debt CSV"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2>Import Debt CSV</h2>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={closeImportDebtDrawer}
                disabled={isDebtCsvImporting}
              >
                Close
              </Button>
            </div>
            <form onSubmit={handleDebtCsvImportSubmit} className="recurring-drawer-form">
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">CSV File</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleDebtCsvFileChange}
                  required
                />
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">
                  Default Loan Origin (optional)
                </span>
                <select
                  value={debtCsvDefaultLoanOrigin}
                  onChange={(event) => setDebtCsvDefaultLoanOrigin(event.target.value)}
                >
                  <option value="">Default Loan Origin (optional)</option>
                  {loanOriginOptions.map((origin) => (
                    <option key={`import-origin-${origin}`} value={origin}>
                      {origin}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">
                  Default Category (optional)
                </span>
                <select
                  value={debtCsvDefaultCategoryId}
                  onChange={(event) => setDebtCsvDefaultCategoryId(event.target.value)}
                >
                  <option value="">Default Category (optional)</option>
                  {debtCategoryOptions.map((category) => (
                    <option key={`import-category-${category.id}`} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              {debtCsvFileName && (
                <p className="subtle-text subtle-text-flush">
                  Loaded file: {debtCsvFileName}
                </p>
              )}
              {debtCsvImportError && (
                <p className="subtle-text subtle-text-error subtle-text-flush">
                  {debtCsvImportError}
                </p>
              )}
              <p className="subtle-text subtle-text-flush">
                Required headers: <code>date</code> or <code>spent_at</code>,{" "}
                <code>description</code>, <code>amount</code>.
              </p>
              <div className="debt-drawer-actions">
                <div className="expense-drawer-right-actions">
                  <Button type="submit" size="sm" disabled={!debtCsvText || isDebtCsvImporting}>
                    {isDebtCsvImporting ? "Importing..." : "Import CSV"}
                  </Button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      )}
      {debtPayoffModal && (
        <div className="modal-backdrop" onClick={closeDebtPayoffModal}>
          <div
            className="modal-card debt-payoff-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Pay off debt"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Pay Off Debt</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="modal-close-button"
                onClick={closeDebtPayoffModal}
                disabled={isDebtPayoffSubmitting}
                aria-label="Close payoff modal"
              >
                ×
              </Button>
            </div>
            <p className="subtle-text">
              Loan Origin: <strong>{debtPayoffModal.loanOrigin}</strong>
            </p>
            <p className="subtle-text">Statement: {debtPayoffModal.cycleLabel}</p>
            <p className="subtle-text">
              Available to pay: {formatMoney(debtPayoffModal.maxAmount)}
            </p>
            <form className="debt-payoff-form" onSubmit={handleDebtPayoffSubmit}>
              <label className="stack-fields">
                Payment Date
                <input
                  type="date"
                  value={debtPayoffForm.payment_date}
                  onChange={(event) =>
                    setDebtPayoffForm((prev) => ({
                      ...prev,
                      payment_date: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="stack-fields">
                Amount
                <input
                  type="text"
                  inputMode="decimal"
                  value={debtPayoffForm.amount}
                  onChange={(event) =>
                    setDebtPayoffForm((prev) => ({
                      ...prev,
                      amount: formatAmountInput(event.target.value),
                    }))
                  }
                  placeholder="0.00"
                  required
                />
              </label>
              {debtPayoffError && (
                <p className="subtle-text subtle-text-error subtle-text-flush">
                  {debtPayoffError}
                </p>
              )}
              <div className="debt-payoff-actions">
                <Button
                  type="button"
                  variant="subtle"
                  size="sm"
                  onClick={closeDebtPayoffModal}
                  disabled={isDebtPayoffSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isDebtPayoffSubmitting}
                >
                  {isDebtPayoffSubmitting ? "Saving..." : "Confirm Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
