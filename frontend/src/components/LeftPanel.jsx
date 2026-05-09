import React from "react";
import RowActionsMenu from "./RowActionsMenu";
import Button from "./ui/Button";
import BadgeButtonGroup from "./ui/BadgeButtonGroup";
import {
  recurringFrequencyLabel,
  recurringFrequencyOptionsForType,
  recurringAccountOptionLabel,
  getRecurringTransferName,
  getRecurringTransferCategoryLabel,
  buildRecurringTransferDestinationAccounts,
  isCrossEntityRecurringTransfer,
} from "../utils/recurring";


export default function LeftPanel({
  activeView,
  compactMode = false,
  modalMode = false,
  currency,
  currencyOptions,
  onCurrencyChange,
  onCurrencySubmit,
  incomeForm,
  onIncomeFormChange,
  onIncomeSubmit,
  incomeAccountOptions = [],
  defaultIncomeAccountOption = null,
  incomeCategoryOptions = [],
  expenseForm,
  onExpenseFormChange,
  onExpenseSubmit,
  expenseAccountOptions = [],
  defaultExpenseAccountOption = null,
  categoryOptions,
  expenseNameOptions = [],
  expenseCategoryOptions,
  entities = [],
  accounts = [],
  activeEntityFilterId = undefined,
  recurringItems,
  pendingRecurringItems,
  recurringForm,
  onRecurringFormChange,
  onRecurringSubmit,
  onConfirmRecurring,
  onSkipRecurring,
  onDeleteRecurring,
  debtForm,
  onDebtFormChange,
  onDebtSubmit,
  onDebtCsvImport,
  debtCategoryOptions,
  onDebtNameChange,
  debtOrigins,
  loanOriginOptions = [],
  onDebtOriginSelect,
  onDebtOriginSuggestionSelect,
  suggestions,
  onCategoryChange,
  onSuggestionSelect,
  formatMoney,
  suggestionForm,
  onSuggestionFormChange,
  onSuggestionSubmit,
  categoryForm,
  onCategoryFormChange,
  onCategorySubmit,
  incomeCategoryForm,
  onIncomeCategoryFormChange,
  onIncomeCategorySubmit,
  balanceBreakdown,
}) {
  const debtCsvFileRef = React.useRef(null);
  const [debtCsvText, setDebtCsvText] = React.useState("");
  const [debtCsvFileName, setDebtCsvFileName] = React.useState("");
  const [debtCsvDefaultLoanOrigin, setDebtCsvDefaultLoanOrigin] =
    React.useState("");
  const [debtCsvDefaultCategoryId, setDebtCsvDefaultCategoryId] =
    React.useState("");
  const [debtCsvImportError, setDebtCsvImportError] = React.useState("");
  const [isDebtCsvImporting, setIsDebtCsvImporting] = React.useState(false);
  const showCompactInline = compactMode && !modalMode;
  const showModalFormOnly = compactMode && modalMode;
  const showFormSectionTitle = !modalMode;
  const topExpenseSuggestions = React.useMemo(() => {
    if (!Array.isArray(suggestions)) {
      return [];
    }

    return [...suggestions]
      .filter(
        (item) =>
          item?.selected_for_encoding === true &&
          typeof item?.category === "string" &&
          item.category.trim()
      )
      .sort((a, b) => {
        const countDelta = Number(b?.count ?? 0) - Number(a?.count ?? 0);
        if (countDelta !== 0) {
          return countDelta;
        }
        return String(a.category).localeCompare(String(b.category));
      })
      .slice(0, 10);
  }, [suggestions]);
  const recurringAccountMap = React.useMemo(() => {
    return new Map((Array.isArray(accounts) ? accounts : []).map((item) => [String(item.id), item]));
  }, [accounts]);
  const recurringSourceAccounts = React.useMemo(() => {
    return Array.isArray(accounts) ? accounts : [];
  }, [accounts]);
  const selectedRecurringSourceAccount = React.useMemo(() => {
    return recurringAccountMap.get(String(recurringForm?.from_account_id || "")) || null;
  }, [recurringAccountMap, recurringForm?.from_account_id]);
  const selectedRecurringDestinationAccount = React.useMemo(() => {
    return recurringAccountMap.get(String(recurringForm?.to_account_id || "")) || null;
  }, [recurringAccountMap, recurringForm?.to_account_id]);
  const recurringDestinationAccounts = React.useMemo(() => {
    return buildRecurringTransferDestinationAccounts(accounts, selectedRecurringSourceAccount);
  }, [accounts, selectedRecurringSourceAccount]);
  const isRecurringTransferCrossEntity = React.useMemo(() => {
    if (recurringForm?.type !== "transfer") {
      return false;
    }
    return isCrossEntityRecurringTransfer(
      selectedRecurringSourceAccount,
      selectedRecurringDestinationAccount
    );
  }, [
    recurringForm?.type,
    selectedRecurringSourceAccount,
    selectedRecurringDestinationAccount,
  ]);

  const handleDebtCsvFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setDebtCsvText("");
      setDebtCsvFileName("");
      return;
    }
    try {
      const text = await file.text();
      setDebtCsvText(text);
      setDebtCsvFileName(file.name);
      setDebtCsvImportError("");
    } catch (err) {
      setDebtCsvImportError("Could not read CSV file");
      setDebtCsvText("");
      setDebtCsvFileName("");
    }
  };

  const handleDebtCsvImport = async (event) => {
    event.preventDefault();
    if (!onDebtCsvImport || !debtCsvText) {
      return;
    }
    setDebtCsvImportError("");
    setIsDebtCsvImporting(true);
    try {
      await onDebtCsvImport({
        csv: debtCsvText,
        default_loan_origin: debtCsvDefaultLoanOrigin.trim() || null,
        default_debt_category_id:
          debtCsvDefaultCategoryId === "" ? null : Number(debtCsvDefaultCategoryId),
      });
      setDebtCsvText("");
      setDebtCsvFileName("");
      setDebtCsvDefaultLoanOrigin("");
      setDebtCsvDefaultCategoryId("");
      if (debtCsvFileRef.current) {
        debtCsvFileRef.current.value = "";
      }
    } catch (err) {
      setDebtCsvImportError(err.message || "Failed to import debt CSV");
    } finally {
      setIsDebtCsvImporting(false);
    }
  };

  const recurringPendingSection = (
    <section>
      <h2>Pending Recurring</h2>
      {pendingRecurringItems.length === 0 ? (
        <p className="empty-state">Nothing is due today.</p>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th className="cell-left">Due</th>
                <th>Name / Source</th>
                <th>Category</th>
                <th className="cell-right">Amount</th>
                <th className="cell-actions" />
              </tr>
            </thead>
            <tbody>
              {pendingRecurringItems.map((item) => (
                <tr key={`pending-recurring-${item.id}`}>
                  <td className="cell-left">{item.next_due_date}</td>
                  <td>
                    {item.type === "transfer"
                      ? getRecurringTransferName(item, activeEntityFilterId)
                      : item.category}
                  </td>
                  <td>
                    {item.type === "transfer"
                      ? getRecurringTransferCategoryLabel(item, activeEntityFilterId)
                      : item.type === "expense"
                        ? item.expense_category_name || "Uncategorized"
                        : item.income_category_name || "Uncategorized"}
                  </td>
                  <td className="cell-right">{formatMoney(item.amount)}</td>
                  <td className="cell-actions">
                    <RowActionsMenu
                      actions={[
                        {
                          label: "Confirm",
                          onClick: () => onConfirmRecurring(item.id),
                        },
                        {
                          label: "Skip",
                          onClick: () => onSkipRecurring(item.id),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  const recurringFormSection = (
    <section>
      {showFormSectionTitle && <h2>Add Recurring Item</h2>}
      <form onSubmit={onRecurringSubmit} className="recurring-form">
        <select
          value={recurringForm.type}
          onChange={(event) => onRecurringFormChange("type", event.target.value)}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </select>
        <input
          type="text"
          inputMode="decimal"
          placeholder="Amount"
          value={recurringForm.amount}
          onChange={(event) => onRecurringFormChange("amount", event.target.value)}
          required
        />
        <input
          type="text"
          placeholder={recurringForm.type === "transfer" ? "Label" : "Name / Source"}
          value={recurringForm.category}
          onChange={(event) => onRecurringFormChange("category", event.target.value)}
          required
        />
        {recurringForm.type === "transfer" && (
          <>
            <select
              value={recurringForm.from_account_id ?? ""}
              onChange={(event) =>
                onRecurringFormChange("from_account_id", event.target.value)
              }
              required
            >
              <option value="">From account</option>
              {recurringSourceAccounts.map((account) => (
                <option key={`recurring-transfer-source-${account.id}`} value={account.id}>
                  {recurringAccountOptionLabel(account)}
                </option>
              ))}
            </select>
            <select
              value={recurringForm.to_account_id ?? ""}
              onChange={(event) =>
                onRecurringFormChange("to_account_id", event.target.value)
              }
              required
            >
              <option value="">To account</option>
              {recurringDestinationAccounts.map((account) => (
                <option key={`recurring-transfer-destination-${account.id}`} value={account.id}>
                  {recurringAccountOptionLabel(account)}
                </option>
              ))}
            </select>
            {selectedRecurringSourceAccount && recurringDestinationAccounts.length === 0 && (
              <p className="empty-state">No compatible destination accounts for this currency.</p>
            )}
            <input
              type="text"
              inputMode="decimal"
              placeholder="Transfer fee"
              value={recurringForm.transfer_fee_amount ?? ""}
              onChange={(event) =>
                onRecurringFormChange("transfer_fee_amount", event.target.value)
              }
            />
            {isRecurringTransferCrossEntity && (
              <label className="checkbox-row recurring-transfer-checkbox">
                <input
                  type="checkbox"
                  checked={Boolean(recurringForm.mirror_as_income_expense)}
                  onChange={(event) =>
                    onRecurringFormChange(
                      "mirror_as_income_expense",
                      event.target.checked
                    )
                  }
                />
                <span>Also record as expense for source and income for destination</span>
              </label>
            )}
            {isRecurringTransferCrossEntity &&
              (
                <>
                  <p className="subtle-text subtle-text-flush recurring-transfer-mapping-label">
                    {recurringForm.mirror_as_income_expense
                      ? "From account records the expense. To account records the income."
                      : "Enable the toggle to also record the source side as expense and the destination side as income."}
                  </p>
                  <select
                    value={recurringForm.expense_category_id ?? ""}
                    onChange={(event) =>
                      onRecurringFormChange("expense_category_id", event.target.value)
                    }
                    disabled={!recurringForm.mirror_as_income_expense}
                  >
                    <option value="">Source expense category</option>
                    {expenseCategoryOptions.map((item) => (
                      <option key={`recurring-transfer-expense-category-${item.id}`} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={recurringForm.income_category_id ?? ""}
                    onChange={(event) =>
                      onRecurringFormChange("income_category_id", event.target.value)
                    }
                    disabled={!recurringForm.mirror_as_income_expense}
                  >
                    <option value="">Destination income category</option>
                    {incomeCategoryOptions.map((item) => (
                      <option key={`recurring-transfer-income-category-${item.id}`} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
          </>
        )}
        {recurringForm.type !== "transfer" && (
          <select
            value={
              recurringForm.type === "expense"
                ? recurringForm.expense_category_id ?? ""
                : recurringForm.income_category_id ?? ""
            }
            onChange={(event) =>
              onRecurringFormChange(
                recurringForm.type === "expense"
                  ? "expense_category_id"
                  : "income_category_id",
                event.target.value
              )
            }
          >
            <option value="">Uncategorized</option>
            {(recurringForm.type === "expense"
              ? expenseCategoryOptions
              : incomeCategoryOptions
            ).map((item) => (
              <option
                key={`recurring-${recurringForm.type}-category-${item.id}`}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>
        )}
        <input
          type="text"
          placeholder="Description (optional)"
          value={recurringForm.description}
          onChange={(event) =>
            onRecurringFormChange("description", event.target.value)
          }
        />
        <select
          value={recurringForm.frequency}
          onChange={(event) => {
            const nextFrequency = event.target.value;
            if (nextFrequency === "semi_monthly" && recurringForm.type !== "income") {
              onRecurringFormChange("frequency", "monthly");
              return;
            }
            onRecurringFormChange("frequency", nextFrequency);
            if (nextFrequency === "semi_monthly") {
              if (!String(recurringForm.semi_monthly_day_1 ?? "").trim()) {
                onRecurringFormChange("semi_monthly_day_1", "15");
              }
              if (!String(recurringForm.semi_monthly_day_2 ?? "").trim()) {
                onRecurringFormChange("semi_monthly_day_2", "30");
              }
            }
          }}
        >
          {recurringFrequencyOptionsForType(recurringForm.type).map((frequency) => (
            <option key={frequency} value={frequency}>
              {recurringFrequencyLabel(frequency)}
            </option>
          ))}
        </select>
        {recurringForm.type === "income" && recurringForm.frequency === "semi_monthly" && (
          <>
            <input
              type="number"
              min={1}
              max={31}
              inputMode="numeric"
              placeholder="Cutoff Day 1"
              value={recurringForm.semi_monthly_day_1 ?? "15"}
              onChange={(event) =>
                onRecurringFormChange("semi_monthly_day_1", event.target.value)
              }
              required
            />
            <input
              type="number"
              min={1}
              max={31}
              inputMode="numeric"
              placeholder="Cutoff Day 2"
              value={recurringForm.semi_monthly_day_2 ?? "30"}
              onChange={(event) =>
                onRecurringFormChange("semi_monthly_day_2", event.target.value)
              }
              required
            />
          </>
        )}
        <input
          type="date"
          value={recurringForm.next_due_date}
          onChange={(event) =>
            onRecurringFormChange("next_due_date", event.target.value)
          }
          required
        />
        <Button type="submit">Add Recurring</Button>
      </form>
    </section>
  );

  if (activeView === "balance") {
    return (
      <>
        {balanceBreakdown}
      </>
    );
  }

  if (activeView === "income") {
    if (showCompactInline) {
      return null;
    }

    return (
      <>
        <section>
          {showFormSectionTitle && <h2>Add Income</h2>}
          <form onSubmit={onIncomeSubmit}>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Amount"
              value={incomeForm.amount}
              onChange={(event) => onIncomeFormChange("amount", event.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Source"
              value={incomeForm.source}
              onChange={(event) => onIncomeFormChange("source", event.target.value)}
              required
            />
            <select
              value={incomeForm.to_account_id ?? ""}
              onChange={(event) =>
                onIncomeFormChange("to_account_id", event.target.value)
              }
              className="select"
            >
              {defaultIncomeAccountOption ? null : (
                <option value="">Select Account</option>
              )}
              {incomeAccountOptions.map((account) => (
                <option key={`income-account-${account.id}`} value={String(account.id)}>
                  {account.name}
                  {account.currency_code ? ` (${account.currency_code})` : ""}
                </option>
              ))}
            </select>
            <select
              value={incomeForm.income_category_id ?? ""}
              onChange={(event) =>
                onIncomeFormChange(
                  "income_category_id",
                  event.target.value === "" ? "" : Number(event.target.value)
                )
              }
              className="select"
            >
              <option value="">Select Category</option>
              {incomeCategoryOptions.map((category) => (
                <option key={`income-category-${category.id}`} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={incomeForm.received_date}
              onChange={(event) =>
                onIncomeFormChange("received_date", event.target.value)
              }
              required
            />
            <Button type="submit">Add</Button>
          </form>
        </section>
      </>
    );
  }

  if (activeView === "expenses") {
    if (showCompactInline) {
      return null;
    }

    return (
      <>
        <section>
          {showFormSectionTitle && <h2>Add Expense</h2>}
          <form onSubmit={onExpenseSubmit}>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Amount"
              value={expenseForm.amount}
              onChange={(event) => onExpenseFormChange("amount", event.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Name"
              value={expenseForm.name}
              onChange={(event) => onCategoryChange(event.target.value)}
              list="category-suggestions"
              required
            />
            <select
              value={expenseForm.from_account_id ?? ""}
              onChange={(event) =>
                onExpenseFormChange("from_account_id", event.target.value)
              }
              className="select"
            >
              {defaultExpenseAccountOption ? null : (
                <option value="">Select Account</option>
              )}
              {expenseAccountOptions.map((account) => (
                <option key={account.id} value={String(account.id)}>
                  {account.name}
                  {account.currency_code ? ` (${account.currency_code})` : ""}
                </option>
              ))}
            </select>
            <datalist id="category-suggestions">
              {expenseNameOptions.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            <select
              value={expenseForm.expense_category_id ?? ""}
              onChange={(event) =>
                onExpenseFormChange(
                  "expense_category_id",
                  event.target.value === "" ? "" : Number(event.target.value)
                )
              }
              className="select"
            >
              <option value="">Select Category</option>
              {expenseCategoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={expenseForm.expense_expectation ?? "unexpected"}
              onChange={(event) =>
                onExpenseFormChange(
                  "expense_expectation",
                  event.target.value === "expected" ? "expected" : "unexpected"
                )
              }
              className="select"
            >
              <option value="unexpected">Unexpected</option>
              <option value="expected">Expected</option>
            </select>
            <input
              type="text"
              placeholder="Notes (optional)"
              value={expenseForm.notes}
              onChange={(event) => onExpenseFormChange("notes", event.target.value)}
            />
            <input
              type="date"
              value={expenseForm.spent_at}
              onChange={(event) => onExpenseFormChange("spent_at", event.target.value)}
              required
            />
            <Button type="submit">Add</Button>
          </form>
          {topExpenseSuggestions.length > 0 && (
            <div>
              <p>Suggestions (click to prefill amount):</p>
              <BadgeButtonGroup
                items={topExpenseSuggestions}
                className="suggestion-badge-group"
                buttonClassName="suggestion-badge"
                getKey={(item) =>
                  `${item.expense_category_id ?? "uncategorized"}::${item.category}`
                }
                getLabel={(item) =>
                  `${item.expense_category_name ? `${item.expense_category_name} - ` : ""}${item.category} (last ${formatMoney(item.last_amount ?? 0)})`
                }
                onItemClick={onSuggestionSelect}
              />
            </div>
          )}
        </section>
      </>
    );
  }

  if (activeView === "recurring") {
    if (showCompactInline) {
      return <>{recurringPendingSection}</>;
    }

    if (showModalFormOnly) {
      return <>{recurringFormSection}</>;
    }

    return (
      <>
        {recurringPendingSection}
        {recurringFormSection}
      </>
    );
  }

  if (activeView === "debts") {
    if (showCompactInline) {
      return null;
    }

    return (
      <>
        <section>
          {showFormSectionTitle && <h2>Add Debt</h2>}
          <form onSubmit={onDebtSubmit}>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Amount"
              value={debtForm.amount}
              onChange={(event) => onDebtFormChange("amount", event.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Name"
              value={debtForm.name}
              onChange={(event) => onDebtNameChange(event.target.value)}
              list="debt-name-suggestions"
              required
            />
            <datalist id="debt-name-suggestions">
              {categoryOptions.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            <select
              value={debtForm.loan_origin || ""}
              onChange={(event) => onDebtOriginSelect(event.target.value)}
              className="select"
            >
              <option value="">Select Loan Origin</option>
              {loanOriginOptions.map((loanOrigin) => (
                <option key={loanOrigin} value={loanOrigin}>
                  {loanOrigin}
                </option>
              ))}
            </select>
            <select
              value={debtForm.debt_category_id ?? ""}
              onChange={(event) =>
                onDebtFormChange(
                  "debt_category_id",
                  event.target.value === "" ? "" : Number(event.target.value)
                )
              }
              className="select"
            >
              <option value="">Select Category</option>
              {debtCategoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Notes (optional)"
              value={debtForm.notes}
              onChange={(event) => onDebtFormChange("notes", event.target.value)}
            />
            <input
              type="date"
              value={debtForm.spent_at}
              onChange={(event) => onDebtFormChange("spent_at", event.target.value)}
              required
            />
            <Button type="submit">Add</Button>
          </form>
        </section>
        <section>
          <h2>Import Debt CSV</h2>
          <form onSubmit={handleDebtCsvImport} className="stack-fields">
            <input
              ref={debtCsvFileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleDebtCsvFileChange}
              required
            />
            <select
              value={debtCsvDefaultLoanOrigin}
              onChange={(event) => setDebtCsvDefaultLoanOrigin(event.target.value)}
              className="select"
            >
              <option value="">Default Loan Origin (optional)</option>
              {loanOriginOptions.map((loanOrigin) => (
                <option key={`import-origin-${loanOrigin}`} value={loanOrigin}>
                  {loanOrigin}
                </option>
              ))}
            </select>
            <select
              value={debtCsvDefaultCategoryId}
              onChange={(event) => setDebtCsvDefaultCategoryId(event.target.value)}
              className="select"
            >
              <option value="">Default Category (optional)</option>
              {debtCategoryOptions.map((category) => (
                <option key={`import-category-${category.id}`} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <Button
              type="submit"
              variant="secondary"
              disabled={!debtCsvText || isDebtCsvImporting}
            >
              {isDebtCsvImporting ? "Importing..." : "Import CSV"}
            </Button>
          </form>
          {debtCsvFileName && (
            <p className="subtle-text">Loaded file: {debtCsvFileName}</p>
          )}
          {debtCsvImportError && (
            <p className="subtle-text subtle-text-error">
              {debtCsvImportError}
            </p>
          )}
          <p className="subtle-text">
            Required headers: <code>date</code> (or <code>spent_at</code>),{" "}
            <code>description</code>, <code>amount</code>. Optional headers:{" "}
            <code>post_date</code>, <code>loan_origin</code>, <code>notes</code>,{" "}
            <code>debt_category</code>, <code>debt_category_id</code>.
          </p>
        </section>
        {debtOrigins.length > 0 && (
          <div>
            <p>Loan Origin Suggestions:</p>
            <BadgeButtonGroup
              items={debtOrigins}
              className="loan-origin-badge-group"
              buttonClassName="loan-origin-badge"
              getKey={(item) => item.loan_origin}
              getLabel={(item) => item.loan_origin}
              onItemClick={onDebtOriginSuggestionSelect}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="config-left-view">
      <section>
        <h2>Currency</h2>
        <form onSubmit={onCurrencySubmit}>
          <select value={currency} onChange={onCurrencyChange}>
            {currencyOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" className="config-left-save-button">
            Save
          </Button>
        </form>
      </section>
    </div>
  );
}
