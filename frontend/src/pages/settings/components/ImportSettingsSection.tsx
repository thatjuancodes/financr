import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "@/api";
import Card from "@/components/base/Card";
import type { AccountRecord, CategoryRecord, EntityRecord } from "@/types/finance";

type ImportKind = "expenses" | "income" | "debts" | "transfers";

type ImportSummary = {
  imported_count?: number;
  skipped_count?: number;
  total_rows?: number;
  errors?: Array<{ line?: number; error?: string }>;
};

type ImportTabState = {
  csv: string;
  entity_id: string;
  default_from_account_id: string;
  default_to_account_id: string;
  default_expense_category_id: string;
  default_income_category_id: string;
  default_debt_category_id: string;
  default_loan_origin: string;
  default_expense_expectation: string;
  file_name: string;
  error: string;
  isSubmitting: boolean;
  result: ImportSummary | null;
};

type Props = {
  accounts: AccountRecord[];
  categories: CategoryRecord[];
  entities: EntityRecord[];
  incomeCategories: CategoryRecord[];
  onImported: () => Promise<void>;
};

const IMPORT_TABS: Array<{ id: ImportKind; label: string }> = [
  { id: "expenses", label: "Expenses" },
  { id: "income", label: "Income" },
  { id: "debts", label: "Debt" },
  { id: "transfers", label: "Transfers" },
];

function createDefaultState(entityId = ""): ImportTabState {
  return {
    csv: "",
    entity_id: entityId,
    default_from_account_id: "",
    default_to_account_id: "",
    default_expense_category_id: "",
    default_income_category_id: "",
    default_debt_category_id: "",
    default_loan_origin: "",
    default_expense_expectation: "unexpected",
    file_name: "",
    error: "",
    isSubmitting: false,
    result: null,
  };
}

function emptyToUndefined(value: string) {
  return value.trim() ? value.trim() : undefined;
}

export default function ImportSettingsSection({
  accounts,
  categories,
  entities,
  incomeCategories,
  onImported,
}: Props) {
  const [activeTab, setActiveTab] = useState<ImportKind>("expenses");
  const [stateByTab, setStateByTab] = useState<Record<ImportKind, ImportTabState>>({
    expenses: createDefaultState(),
    income: createDefaultState(),
    debts: createDefaultState(),
    transfers: createDefaultState(""),
  });

  useEffect(() => {
    const defaultEntityId = entities[0]?.id || "";
    if (!defaultEntityId) {
      return;
    }
    setStateByTab((current) => {
      const next = { ...current };
      for (const key of ["expenses", "income", "debts"] as ImportKind[]) {
        if (!next[key].entity_id) {
          next[key] = { ...next[key], entity_id: defaultEntityId };
        }
      }
      return next;
    });
  }, [entities]);

  const activeState = stateByTab[activeTab];
  const scopedExpenseAccounts = useMemo(
    () =>
      accounts.filter((account) =>
        activeTab === "expenses" || activeTab === "debts"
          ? account.entity_id === activeState.entity_id
          : account.entity_id === stateByTab.income.entity_id
      ),
    [accounts, activeState.entity_id, activeTab, stateByTab.income.entity_id]
  );
  const scopedIncomeAccounts = useMemo(
    () => accounts.filter((account) => account.entity_id === stateByTab.income.entity_id),
    [accounts, stateByTab.income.entity_id]
  );

  function updateTabState(kind: ImportKind, patch: Partial<ImportTabState>) {
    setStateByTab((current) => ({
      ...current,
      [kind]: {
        ...current[kind],
        ...patch,
      },
    }));
  }

  async function handleFileSelected(kind: ImportKind, file: File | null) {
    if (!file) {
      return;
    }
    const csv = await file.text();
    updateTabState(kind, {
      csv,
      file_name: file.name,
      error: "",
      result: null,
    });
  }

  async function submitImport(kind: ImportKind) {
    const current = stateByTab[kind];
    updateTabState(kind, {
      isSubmitting: true,
      error: "",
      result: null,
    });

    try {
      let result: ImportSummary;
      if (kind === "expenses") {
        result = await api.importExpenseCsv({
          csv: current.csv,
          entity_id: current.entity_id,
          default_from_account_id: emptyToUndefined(current.default_from_account_id),
          default_expense_category_id: emptyToUndefined(
            current.default_expense_category_id
          ),
          default_expense_expectation: current.default_expense_expectation,
        });
      } else if (kind === "income") {
        result = await api.importIncomeCsv({
          csv: current.csv,
          entity_id: current.entity_id,
          default_to_account_id: emptyToUndefined(current.default_to_account_id),
          default_income_category_id: emptyToUndefined(
            current.default_income_category_id
          ),
        });
      } else if (kind === "debts") {
        result = await api.importDebtCsv({
          csv: current.csv,
          entity_id: current.entity_id,
          default_debt_category_id: emptyToUndefined(
            current.default_debt_category_id
          ),
          default_loan_origin: emptyToUndefined(current.default_loan_origin),
        });
      } else {
        result = await api.importTransferCsv({
          csv: current.csv,
        });
      }

      updateTabState(kind, {
        isSubmitting: false,
        result,
      });
      await onImported();
    } catch (error: any) {
      updateTabState(kind, {
        isSubmitting: false,
        error: error?.message || "Import failed",
      });
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-text">CSV Imports</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Upload or paste CSV data, then import it into the matching record type.
        </p>
      </Card>

      <div className="flex flex-wrap gap-2">
        {IMPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? "bg-accent text-white"
                : "bg-bg-subtle text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="p-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
          <div className="space-y-4">
            {activeTab === "expenses" ? (
              <ExpenseImportFields
                accounts={accounts.filter(
                  (account) => account.entity_id === stateByTab.expenses.entity_id
                )}
                categories={categories}
                entities={entities}
                state={stateByTab.expenses}
                onChange={(patch) => updateTabState("expenses", patch)}
              />
            ) : null}

            {activeTab === "income" ? (
              <IncomeImportFields
                accounts={scopedIncomeAccounts}
                entities={entities}
                incomeCategories={incomeCategories}
                state={stateByTab.income}
                onChange={(patch) => updateTabState("income", patch)}
              />
            ) : null}

            {activeTab === "debts" ? (
              <DebtImportFields
                categories={categories}
                entities={entities}
                state={stateByTab.debts}
                onChange={(patch) => updateTabState("debts", patch)}
              />
            ) : null}

            {activeTab === "transfers" ? (
              <TransferImportFields />
            ) : null}

            <div className="rounded-xl bg-bg-subtle p-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-text shadow-sm">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(event) => {
                      void handleFileSelected(activeTab, event.target.files?.[0] || null);
                      event.currentTarget.value = "";
                    }}
                  />
                  Choose CSV file
                </label>
                {activeState.file_name ? (
                  <span className="text-sm text-text-secondary">{activeState.file_name}</span>
                ) : (
                  <span className="text-sm text-text-secondary">No file selected</span>
                )}
              </div>
              <textarea
                value={activeState.csv}
                onChange={(event) =>
                  updateTabState(activeTab, {
                    csv: event.target.value,
                    error: "",
                    result: null,
                  })
                }
                placeholder={placeholderFor(activeTab)}
                className="mt-4 min-h-[260px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
              />
            </div>

            {activeState.error ? (
              <div className="rounded-xl border border-negative/20 bg-negative-light p-4 text-sm text-negative-dark">
                {activeState.error}
              </div>
            ) : null}

            {activeState.result ? <ImportResult summary={activeState.result} /> : null}

            <button
              type="button"
              disabled={activeState.isSubmitting || !activeState.csv.trim()}
              onClick={() => void submitImport(activeTab)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeState.isSubmitting ? "Importing..." : `Import ${labelFor(activeTab)}`}
            </button>
          </div>

          <ImportGuide
            activeTab={activeTab}
            expenseAccounts={scopedExpenseAccounts}
            incomeAccounts={scopedIncomeAccounts}
          />
        </div>
      </Card>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
      {children}
    </span>
  );
}

function ExpenseImportFields({
  accounts,
  categories,
  entities,
  state,
  onChange,
}: {
  accounts: AccountRecord[];
  categories: CategoryRecord[];
  entities: EntityRecord[];
  state: ImportTabState;
  onChange: (patch: Partial<ImportTabState>) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label>
        <FieldLabel>Entity</FieldLabel>
        <select
          value={state.entity_id}
          onChange={(event) =>
            onChange({
              entity_id: event.target.value,
              default_from_account_id: "",
            })
          }
          className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
        >
          {entities.map((entity) => (
            <option key={entity.id} value={entity.id}>
              {entity.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <FieldLabel>Default Source Account</FieldLabel>
        <select
          value={state.default_from_account_id}
          onChange={(event) => onChange({ default_from_account_id: event.target.value })}
          className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
        >
          <option value="">Use entity default account</option>
          {accounts.map((account) => (
            <option key={account.id} value={String(account.id)}>
              {account.name} ({account.currency_code})
            </option>
          ))}
        </select>
      </label>

      <label>
        <FieldLabel>Default Expense Category</FieldLabel>
        <select
          value={state.default_expense_category_id}
          onChange={(event) =>
            onChange({ default_expense_category_id: event.target.value })
          }
          className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
        >
          <option value="">None</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <FieldLabel>Default Expectation</FieldLabel>
        <select
          value={state.default_expense_expectation}
          onChange={(event) =>
            onChange({ default_expense_expectation: event.target.value })
          }
          className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
        >
          <option value="unexpected">unexpected</option>
          <option value="expected">expected</option>
        </select>
      </label>
    </div>
  );
}

function IncomeImportFields({
  accounts,
  entities,
  incomeCategories,
  state,
  onChange,
}: {
  accounts: AccountRecord[];
  entities: EntityRecord[];
  incomeCategories: CategoryRecord[];
  state: ImportTabState;
  onChange: (patch: Partial<ImportTabState>) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label>
        <FieldLabel>Entity</FieldLabel>
        <select
          value={state.entity_id}
          onChange={(event) =>
            onChange({
              entity_id: event.target.value,
              default_to_account_id: "",
            })
          }
          className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
        >
          {entities.map((entity) => (
            <option key={entity.id} value={entity.id}>
              {entity.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <FieldLabel>Default Destination Account</FieldLabel>
        <select
          value={state.default_to_account_id}
          onChange={(event) => onChange({ default_to_account_id: event.target.value })}
          className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
        >
          <option value="">Use entity default account</option>
          {accounts.map((account) => (
            <option key={account.id} value={String(account.id)}>
              {account.name} ({account.currency_code})
            </option>
          ))}
        </select>
      </label>

      <label>
        <FieldLabel>Default Income Category</FieldLabel>
        <select
          value={state.default_income_category_id}
          onChange={(event) =>
            onChange({ default_income_category_id: event.target.value })
          }
          className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
        >
          <option value="">None</option>
          {incomeCategories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function DebtImportFields({
  categories,
  entities,
  state,
  onChange,
}: {
  categories: CategoryRecord[];
  entities: EntityRecord[];
  state: ImportTabState;
  onChange: (patch: Partial<ImportTabState>) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label>
        <FieldLabel>Entity</FieldLabel>
        <select
          value={state.entity_id}
          onChange={(event) => onChange({ entity_id: event.target.value })}
          className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
        >
          {entities.map((entity) => (
            <option key={entity.id} value={entity.id}>
              {entity.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <FieldLabel>Default Debt Category</FieldLabel>
        <select
          value={state.default_debt_category_id}
          onChange={(event) => onChange({ default_debt_category_id: event.target.value })}
          className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
        >
          <option value="">None</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label className="md:col-span-2">
        <FieldLabel>Default Loan Origin</FieldLabel>
        <input
          value={state.default_loan_origin}
          onChange={(event) => onChange({ default_loan_origin: event.target.value })}
          placeholder="Optional fallback loan origin"
          className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
        />
      </label>
    </div>
  );
}

function TransferImportFields() {
  return (
    <div className="rounded-xl bg-bg-subtle p-4 text-sm text-text-secondary">
      Transfer CSV rows can use account IDs or exact account names. If names are duplicated
      across entities, include `from_entity_id` / `to_entity_id` or
      `from_entity_name` / `to_entity_name` to disambiguate.
    </div>
  );
}

function ImportGuide({
  activeTab,
  expenseAccounts,
  incomeAccounts,
}: {
  activeTab: ImportKind;
  expenseAccounts: AccountRecord[];
  incomeAccounts: AccountRecord[];
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-bg-subtle p-4">
        <h3 className="text-sm font-semibold text-text">Accepted Headers</h3>
        <p className="mt-2 text-sm text-text-secondary">{guideTextFor(activeTab)}</p>
      </div>

      {(activeTab === "expenses" || activeTab === "income") && (
        <div className="rounded-xl bg-bg-subtle p-4">
          <h3 className="text-sm font-semibold text-text">Visible Account IDs</h3>
          <div className="mt-3 space-y-2 text-sm text-text-secondary">
            {(activeTab === "expenses" ? expenseAccounts : incomeAccounts).map((account) => (
              <div key={account.id} className="flex items-center justify-between gap-3">
                <span className="truncate">{account.name}</span>
                <span className="font-mono text-xs text-text">{account.id}</span>
              </div>
            ))}
            {(activeTab === "expenses" ? expenseAccounts : incomeAccounts).length === 0 ? (
              <p>No accounts for the selected entity.</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function ImportResult({ summary }: { summary: ImportSummary }) {
  const errors = Array.isArray(summary.errors) ? summary.errors : [];

  return (
    <div className="rounded-xl border border-positive/20 bg-positive-light p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <ResultStat label="Imported" value={String(summary.imported_count ?? 0)} />
        <ResultStat label="Skipped" value={String(summary.skipped_count ?? 0)} />
        <ResultStat label="Rows" value={String(summary.total_rows ?? 0)} />
      </div>
      {errors.length > 0 ? (
        <div className="mt-4 rounded-lg bg-white/80 p-3 text-sm text-text">
          <p className="font-medium">Skipped rows</p>
          <div className="mt-2 space-y-1">
            {errors.map((item, index) => (
              <p key={`${item.line || "row"}:${index}`}>
                Line {item.line || "?"}: {item.error || "Unknown error"}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/80 p-3">
      <p className="text-2xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text">{value}</p>
    </div>
  );
}

function labelFor(kind: ImportKind) {
  return IMPORT_TABS.find((tab) => tab.id === kind)?.label || kind;
}

function placeholderFor(kind: ImportKind) {
  if (kind === "expenses") {
    return "date,amount,name,notes\n2026-05-01,1200.50,Groceries,Weekend market";
  }
  if (kind === "income") {
    return "received_date,amount,source\n2026-05-01,35000,Salary";
  }
  if (kind === "debts") {
    return "date,amount,description,loan_origin\n2026-05-10,4500,Credit card payment,BPI Visa";
  }
  return "date,amount,from_account_id,to_account_id,notes\n2026-05-01,5000,12,8,Wallet top-up";
}

function guideTextFor(kind: ImportKind) {
  if (kind === "expenses") {
    return "Required: date/spent_at, amount, and name/description. Optional: from_account_id, from_account, expense_category_id, expense_category, notes, expense_expectation.";
  }
  if (kind === "income") {
    return "Required: received_date/date, amount, and source/name. Optional: to_account_id, to_account, income_category_id, income_category.";
  }
  if (kind === "debts") {
    return "Required: date, amount, and description/name. Optional: loan_origin, debt_category_id, debt_category, notes. Missing categories are created automatically.";
  }
  return "Required: date, amount, from_account_id or from_account, and to_account_id or to_account. Optional: transfer_fee_amount, notes, mirror_as_income_expense, expense_category_id, income_category_id, from_entity_id, to_entity_id.";
}
