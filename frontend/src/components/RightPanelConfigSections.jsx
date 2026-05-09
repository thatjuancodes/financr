import React from "react";
import RowActionsMenu from "./RowActionsMenu";
import Button from "./ui/Button";
import { buildCategoryBadgeStyle, resolveCategoryColor } from "../utils/categoryColors";

export function GeneralSection({
  currency,
  currencyOptions = [],
  onCurrencyChange,
  onCurrencySubmit,
}) {
  return (
    <section className="institution-config-section">
      <div className="section-header">
        <h2>General</h2>
      </div>
      <div className="config-general-card">
        <div className="config-general-copy">
          <strong>Base Currency</strong>
          <p className="subtle-text subtle-text-flush">
            Set the app-wide default currency for summaries and new records.
          </p>
        </div>
        <form onSubmit={onCurrencySubmit} className="config-general-form">
          <select value={currency} onChange={onCurrencyChange}>
            {currencyOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm">
            Save
          </Button>
        </form>
      </div>
    </section>
  );
}

export function InstitutionsSection({
  institutions,
  activeBankConfigId,
  openBankConfigDrawer,
  handleBankConfigKeyDown,
  openAddBankDrawer,
}) {
  return (
    <section className="institution-config-section">
      <div className="section-header">
        <h2>Institutions</h2>
        <div className="section-header-actions">
          <Button type="button" variant="primary" size="sm" onClick={openAddBankDrawer}>
            Add Institution
          </Button>
        </div>
      </div>
      {institutions.length === 0 ? (
        <p className="empty-state">No institutions yet. Use Add Institution to create one.</p>
      ) : (
        <>
          <p className="subtle-text subtle-text-flush recurring-table-hint">
            Click a row to edit.
          </p>
          <div className="table-scroll">
            <table className="table institution-config-table">
              <thead>
                <tr>
                  <th className="cell-left">Name</th>
                  <th className="cell-left">Type</th>
                  <th className="cell-left">Code</th>
                  <th className="cell-left">Currency</th>
                  <th className="cell-left">SWIFT Code</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((item) => (
                  <tr
                    key={`bank-config-${item.id}`}
                    className={`clickable-row${item.id === activeBankConfigId ? " active" : ""}`}
                    onClick={() => openBankConfigDrawer(item.id)}
                    onKeyDown={(event) => handleBankConfigKeyDown(event, item.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Edit institution ${item.name}`}
                  >
                    <td className="cell-left">{item.name}</td>
                    <td className="cell-left">
                      {item.type === "e_wallet" ? "E-wallet" : "Bank"}
                    </td>
                    <td className="cell-left">{item.code || "-"}</td>
                    <td className="cell-left">{item.currency_code || "PHP"}</td>
                    <td className="cell-left">{item.swift_code || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function CategoryChipSection({
  title,
  buttonLabel,
  records,
  activeId,
  openDrawer,
  handleKeyDown,
  emptyText,
  colorKeyPrefix,
  onAdd,
}) {
  return (
    <section>
      <div className="section-header">
        <h2>{title}</h2>
        <div className="section-header-actions">
          <Button type="button" size="sm" onClick={onAdd} aria-label={buttonLabel}>
            Add Category
          </Button>
        </div>
      </div>
      <div className="category-badge-list">
        {records.map((item) => (
          <button
            key={`${colorKeyPrefix}-${item.id}`}
            type="button"
            className={`category-chip category-chip-button${item.id === activeId ? " active" : ""}`}
            onClick={() => openDrawer(item.id)}
            onKeyDown={(event) => handleKeyDown(event, item.id)}
            aria-label={`Edit ${title.toLowerCase()} ${item.name}`}
            style={buildCategoryBadgeStyle(
              resolveCategoryColor(item.color, `${colorKeyPrefix}:${item.id}:${item.name}`)
            )}
          >
            {item.icon ? <i className={`${item.icon} category-chip-icon`} aria-hidden="true" /> : null}
            <span className="category-chip-label">{item.name}</span>
          </button>
        ))}
      </div>
      {records.length === 0 && <p className="empty-state">{emptyText}</p>}
    </section>
  );
}

export function ExpenseCategoriesSection(props) {
  return (
    <CategoryChipSection
      title="Expense Categories"
      buttonLabel="Add expense category"
      records={props.categoryRecords}
      activeId={props.activeCategoryId}
      openDrawer={props.openCategoryDrawer}
      handleKeyDown={props.handleCategoryChipKeyDown}
      emptyText="No expense categories yet. Use Add Category to create one."
      colorKeyPrefix="expense"
      onAdd={props.openAddCategoryDrawer}
    />
  );
}

export function IncomeCategoriesSection(props) {
  return (
    <CategoryChipSection
      title="Income Categories"
      buttonLabel="Add income category"
      records={props.incomeCategoryRecords}
      activeId={props.activeIncomeCategoryId}
      openDrawer={props.openIncomeCategoryDrawer}
      handleKeyDown={props.handleIncomeCategoryChipKeyDown}
      emptyText="No income categories yet. Use Add Category to create one."
      colorKeyPrefix="income"
      onAdd={props.openAddIncomeCategoryDrawer}
    />
  );
}

export function SuggestionsSection({
  suggestions,
  activeSuggestionKey,
  suggestionKey,
  isSuggestionSelectedForEncoding,
  openAddSuggestionDrawer,
  openSuggestionDrawer,
  handleSuggestionChipKeyDown,
  formatMoney,
}) {
  return (
    <section>
      <div className="section-header">
        <h2>Suggestions</h2>
        <div className="section-header-actions">
          <Button type="button" size="sm" onClick={openAddSuggestionDrawer} aria-label="Add suggestion">
            Add Suggestion
          </Button>
        </div>
      </div>
      <div className="category-badge-list suggestion-chip-list">
        {suggestions.map((item) => (
          <button
            key={`suggestion-${suggestionKey(item)}`}
            type="button"
            className={`category-chip category-chip-button suggestion-chip${
              suggestionKey(item) === activeSuggestionKey ? " active" : ""
            }${
              isSuggestionSelectedForEncoding(item?.selected_for_encoding)
                ? " suggestion-chip-selected"
                : ""
            }`}
            onClick={() => openSuggestionDrawer(item)}
            onKeyDown={(event) => handleSuggestionChipKeyDown(event, item)}
            aria-label={`Edit suggestion ${item.category}`}
          >
            <span className="category-chip-label">
              {item.expense_category_name
                ? `${item.expense_category_name} - ${item.category}`
                : item.category}
            </span>
            <span className="suggestion-chip-amount">
              {formatMoney(Number(item.last_amount ?? 0))}
            </span>
          </button>
        ))}
      </div>
      {suggestions.length === 0 && (
        <p className="empty-state">No suggestions yet. Use Add Suggestion to create one.</p>
      )}
    </section>
  );
}

export function DebtStatementsSection({
  loanOriginConfigs,
  activeLoanOriginConfigId,
  openLoanOriginConfigDrawer,
  handleLoanOriginConfigKeyDown,
  openAddLoanOriginDrawer,
}) {
  return (
    <section className="debt-config-section">
      <div className="section-header">
        <h2>Debt Statements</h2>
        <div className="section-header-actions">
          <Button type="button" variant="primary" size="sm" onClick={openAddLoanOriginDrawer}>
            Add Debt Statement
          </Button>
        </div>
      </div>
      {loanOriginConfigs.length === 0 ? (
        <p className="empty-state">
          No debt statement rules yet. Use Add Debt Statement to create one.
        </p>
      ) : (
        <>
          <p className="subtle-text subtle-text-flush recurring-table-hint">
            Click a row to edit.
          </p>
          <div className="table-scroll">
            <table className="table debt-config-table">
              <thead>
                <tr>
                  <th className="cell-left">Loan Origin</th>
                  <th className="cell-right">Debt Records</th>
                  <th className="cell-left">Statement Day</th>
                  <th className="cell-left">Due Day</th>
                </tr>
              </thead>
              <tbody>
                {loanOriginConfigs.map((item) => (
                  <tr
                    key={`loan-origin-config-${item.loan_origin}`}
                    className={`clickable-row${
                      item.loan_origin === activeLoanOriginConfigId ? " active" : ""
                    }`}
                    onClick={() => openLoanOriginConfigDrawer(item.loan_origin)}
                    onKeyDown={(event) =>
                      handleLoanOriginConfigKeyDown(event, item.loan_origin)
                    }
                    role="button"
                    tabIndex={0}
                    aria-label={`Edit debt statement ${item.loan_origin}`}
                  >
                    <td className="cell-left">{item.loan_origin}</td>
                    <td className="cell-right">{Number(item.debt_count ?? 0)}</td>
                    <td className="cell-left">
                      {item.statement_day ?? "-"}
                    </td>
                    <td className="cell-left">{item.due_day ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="subtle-text">
        Use day-of-month values (1-31). Leave blank to clear a value.
      </p>
    </section>
  );
}

export function DataExportSection({
  handleExportDataset,
  exportingDataset,
  dataExportError,
}) {
  return (
    <section className="data-export-section">
      <h2>Data Export</h2>
      <p className="subtle-text subtle-text-flush">
        Download separate CSV files for expenses, income, debts, and recurring
        records.
      </p>
      <div className="data-export-grid">
        <Button
          type="button"
          size="sm"
          className="config-export-button"
          onClick={() => handleExportDataset("expenses")}
          disabled={Boolean(exportingDataset)}
        >
          {exportingDataset === "expenses" ? "Exporting..." : "Export Expenses CSV"}
        </Button>
        <Button
          type="button"
          size="sm"
          className="config-export-button"
          onClick={() => handleExportDataset("income")}
          disabled={Boolean(exportingDataset)}
        >
          {exportingDataset === "income" ? "Exporting..." : "Export Income CSV"}
        </Button>
        <Button
          type="button"
          size="sm"
          className="config-export-button"
          onClick={() => handleExportDataset("debts")}
          disabled={Boolean(exportingDataset)}
        >
          {exportingDataset === "debts" ? "Exporting..." : "Export Debts CSV"}
        </Button>
        <Button
          type="button"
          size="sm"
          className="config-export-button"
          onClick={() => handleExportDataset("recurring")}
          disabled={Boolean(exportingDataset)}
        >
          {exportingDataset === "recurring" ? "Exporting..." : "Export Recurring CSV"}
        </Button>
      </div>
      {dataExportError && (
        <p className="subtle-text subtle-text-error subtle-text-flush">{dataExportError}</p>
      )}
    </section>
  );
}
