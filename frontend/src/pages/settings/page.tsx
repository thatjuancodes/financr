import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "@/components/base/Card";
import Navbar from "@/components/feature/Navbar";
import { EmptyState, LoadingState } from "@/components/feature/PageState";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import { formatCurrency } from "@/lib/finance";
import { AutomationContent } from "@/pages/automation/page";

type SettingsTab = "accounts" | "categories" | "budgets" | "automation" | "app";

const SETTINGS_TABS: SettingsTab[] = ["accounts", "categories", "budgets", "automation", "app"];

const accountTypes = ["bank", "cash", "ewallet", "credit"];
const entityTypes = ["personal", "family", "business"];
const currencyOptions = ["PHP", "USD", "VND", "EUR", "GBP", "JPY", "AUD", "CAD"];

export default function Settings() {
  const {
    accounts,
    balance,
    budgets,
    categories,
    createAccount,
    createBudget,
    createCategory,
    createEntity,
    createIncomeCategory,
    deleteAccount,
    deleteBudget,
    deleteCategory,
    deleteEntity,
    deleteIncomeCategory,
    entities,
    incomeCategories,
    loading,
    setCurrency,
    settings,
  } = useFinanceData();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = SETTINGS_TABS.includes((tabParam || "") as SettingsTab)
    ? ((tabParam || "accounts") as SettingsTab)
    : "accounts";
  const currency = settings?.currency_code || "PHP";

  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState("personal");
  const [accountName, setAccountName] = useState("");
  const [accountEntityId, setAccountEntityId] = useState(() => entities[0]?.id || "");
  const [accountType, setAccountType] = useState("bank");
  const [accountCurrency, setAccountCurrency] = useState(currency);
  const [expenseCategoryName, setExpenseCategoryName] = useState("");
  const [incomeCategoryName, setIncomeCategoryName] = useState("");
  const [budgetForm, setBudgetForm] = useState({
    entity_id: "",
    name: "",
    category: "",
    target_amount: "",
    payment_plan: "one_time",
    payment_frequency: "once",
    payment_amount: "",
    payment_count: "",
    start_date: new Date().toISOString().slice(0, 10),
  });

  const entityAccounts = useMemo(() => {
    return entities.map((entity) => ({
      entity,
      accounts: accounts.filter((account) => account.entity_id === entity.id),
    }));
  }, [accounts, entities]);

  async function submitBudget() {
    await createBudget({
      ...budgetForm,
      entity_id: budgetForm.entity_id || entities[0]?.id,
      target_amount: Number(budgetForm.target_amount || 0),
      payment_amount:
        budgetForm.payment_plan === "one_time"
          ? Number(budgetForm.target_amount || 0)
          : Number(budgetForm.payment_amount || 0),
      payment_count:
        budgetForm.payment_plan === "one_time"
          ? 1
          : budgetForm.payment_count
            ? Number(budgetForm.payment_count)
            : null,
    });
    setBudgetForm((prev) => ({
      ...prev,
      name: "",
      category: "",
      target_amount: "",
      payment_amount: "",
      payment_count: "",
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <main className="px-4 pb-12 pt-20 md:px-8">
          <LoadingState label="Loading settings..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="px-4 pb-12 pt-20 md:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text">Settings</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage entities, accounts, categories, budgets, automation, and app currency
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {SETTINGS_TABS.map((value) => (
            <button
              key={value}
              onClick={() => setSearchParams({ tab: value })}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
                tab === value ? "bg-accent text-white" : "bg-bg-subtle text-text-secondary"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        {tab === "accounts" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card className="p-5">
                <h2 className="mb-4 text-lg font-semibold text-text">Create Entity</h2>
                <div className="space-y-3">
                  <input
                    value={entityName}
                    onChange={(event) => setEntityName(event.target.value)}
                    placeholder="Entity name"
                    className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                  />
                  <select
                    value={entityType}
                    onChange={(event) => setEntityType(event.target.value)}
                    className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                  >
                    {entityTypes.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={async () => {
                      await createEntity({ name: entityName, type: entityType });
                      setEntityName("");
                    }}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
                  >
                    Add entity
                  </button>
                </div>
              </Card>

              <Card className="p-5">
                <h2 className="mb-4 text-lg font-semibold text-text">Create Account</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={accountName}
                    onChange={(event) => setAccountName(event.target.value)}
                    placeholder="Account name"
                    className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                  />
                  <select
                    value={accountEntityId}
                    onChange={(event) => setAccountEntityId(event.target.value)}
                    className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                  >
                    <option value="">Select entity</option>
                    {entities.map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={accountType}
                    onChange={(event) => setAccountType(event.target.value)}
                    className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                  >
                    {accountTypes.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <select
                    value={accountCurrency}
                    onChange={(event) => setAccountCurrency(event.target.value)}
                    className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                  >
                    {currencyOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={async () => {
                    await createAccount({
                      name: accountName,
                      entity_id: accountEntityId || entities[0]?.id,
                      type: accountType,
                      currency_code: accountCurrency,
                    });
                    setAccountName("");
                  }}
                  className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
                >
                  Add account
                </button>
              </Card>
            </div>

            {entityAccounts.length === 0 ? (
              <EmptyState title="No entities found" body="Create an entity to get started." />
            ) : (
              entityAccounts.map(({ entity, accounts: scopedAccounts }) => (
                <Card key={entity.id} className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-text">{entity.name}</h3>
                      <p className="text-sm capitalize text-text-secondary">{entity.type}</p>
                    </div>
                    <button
                      onClick={() => deleteEntity(entity.id)}
                      className="rounded-md bg-negative-light px-3 py-1.5 text-sm font-medium text-negative-dark"
                    >
                      Delete entity
                    </button>
                  </div>
                  <div className="space-y-2">
                    {scopedAccounts.length === 0 ? (
                      <p className="text-sm text-text-secondary">No accounts yet.</p>
                    ) : (
                      scopedAccounts.map((account) => (
                        <div key={account.id} className="flex items-center justify-between rounded-lg bg-bg-subtle px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-text">{account.name}</p>
                            <p className="text-2xs text-text-secondary">
                              {account.type} • {account.currency_code}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-text">
                              {formatCurrency(account.balance, account.currency_code)}
                            </span>
                            <button
                              onClick={() => deleteAccount(account.id)}
                              className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-negative-dark"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : null}

        {tab === "categories" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 text-lg font-semibold text-text">Expense Categories</h2>
              <div className="mb-4 flex gap-3">
                <input
                  value={expenseCategoryName}
                  onChange={(event) => setExpenseCategoryName(event.target.value)}
                  placeholder="New expense category"
                  className="flex-1 rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                />
                <button
                  onClick={async () => {
                    await createCategory({ name: expenseCategoryName });
                    setExpenseCategoryName("");
                  }}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between rounded-lg bg-bg-subtle px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color || "#CBD5E1" }} />
                      <span className="text-sm text-text">{category.name}</span>
                    </div>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-negative-dark"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-lg font-semibold text-text">Income Categories</h2>
              <div className="mb-4 flex gap-3">
                <input
                  value={incomeCategoryName}
                  onChange={(event) => setIncomeCategoryName(event.target.value)}
                  placeholder="New income category"
                  className="flex-1 rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                />
                <button
                  onClick={async () => {
                    await createIncomeCategory({ name: incomeCategoryName });
                    setIncomeCategoryName("");
                  }}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {incomeCategories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between rounded-lg bg-bg-subtle px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color || "#CBD5E1" }} />
                      <span className="text-sm text-text">{category.name}</span>
                    </div>
                    <button
                      onClick={() => deleteIncomeCategory(category.id)}
                      className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-negative-dark"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : null}

        {tab === "budgets" ? (
          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="mb-4 text-lg font-semibold text-text">Create Budget</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <select
                  value={budgetForm.entity_id}
                  onChange={(event) => setBudgetForm((prev) => ({ ...prev, entity_id: event.target.value }))}
                  className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                >
                  <option value="">Select entity</option>
                  {entities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </select>
                <input
                  value={budgetForm.name}
                  onChange={(event) => setBudgetForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Budget name"
                  className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                />
                <input
                  value={budgetForm.category}
                  onChange={(event) => setBudgetForm((prev) => ({ ...prev, category: event.target.value }))}
                  placeholder="Category"
                  className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                />
                <input
                  value={budgetForm.target_amount}
                  onChange={(event) => setBudgetForm((prev) => ({ ...prev, target_amount: event.target.value }))}
                  placeholder="Target amount"
                  className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                />
                <select
                  value={budgetForm.payment_plan}
                  onChange={(event) =>
                    setBudgetForm((prev) => ({
                      ...prev,
                      payment_plan: event.target.value,
                      payment_frequency: event.target.value === "one_time" ? "once" : "monthly",
                    }))
                  }
                  className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                >
                  <option value="one_time">one_time</option>
                  <option value="installment">installment</option>
                </select>
                <select
                  value={budgetForm.payment_frequency}
                  onChange={(event) => setBudgetForm((prev) => ({ ...prev, payment_frequency: event.target.value }))}
                  className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                >
                  <option value="once">once</option>
                  <option value="weekly">weekly</option>
                  <option value="monthly">monthly</option>
                  <option value="yearly">yearly</option>
                </select>
                {budgetForm.payment_plan === "installment" ? (
                  <>
                    <input
                      value={budgetForm.payment_amount}
                      onChange={(event) => setBudgetForm((prev) => ({ ...prev, payment_amount: event.target.value }))}
                      placeholder="Payment amount"
                      className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                    />
                    <input
                      value={budgetForm.payment_count}
                      onChange={(event) => setBudgetForm((prev) => ({ ...prev, payment_count: event.target.value }))}
                      placeholder="Payment count"
                      className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                    />
                  </>
                ) : null}
                <input
                  type="date"
                  value={budgetForm.start_date}
                  onChange={(event) => setBudgetForm((prev) => ({ ...prev, start_date: event.target.value }))}
                  className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                />
              </div>
              <button
                onClick={submitBudget}
                className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
              >
                Add budget
              </button>
            </Card>

            {budgets.length === 0 ? (
              <EmptyState title="No budgets found" body="Create a budget to start planning future spending." />
            ) : (
              budgets.map((budget) => (
                <Card key={budget.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-text">{budget.name}</h3>
                      <p className="text-sm text-text-secondary">
                        {budget.entity_name} • {budget.category || "Uncategorized"}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteBudget(budget.id)}
                      className="rounded-md bg-negative-light px-3 py-1.5 text-sm font-medium text-negative-dark"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                    <BudgetStat label="Target" value={formatCurrency(budget.target_amount, currency)} />
                    <BudgetStat label="Remaining" value={formatCurrency(budget.remaining_amount, currency)} />
                    <BudgetStat label="Next" value={budget.next_payment_date || "Done"} />
                    <BudgetStat label="Monthly Impact" value={formatCurrency(budget.monthly_impact, currency)} />
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : null}

        {tab === "automation" ? <AutomationContent showHeader={false} /> : null}

        {tab === "app" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 text-lg font-semibold text-text">App Currency</h2>
              <div className="flex gap-3">
                <select
                  defaultValue={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                >
                  {currencyOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-lg font-semibold text-text">Snapshot</h2>
              <div className="grid grid-cols-2 gap-3">
                <BudgetStat label="Tracked Balance" value={formatCurrency(balance?.balance || 0, currency)} />
                <BudgetStat label="Base Balance" value={formatCurrency(settings?.base_balance || 0, currency)} />
                <BudgetStat label="Accounts" value={String(accounts.length)} />
                <BudgetStat label="Budgets" value={String(budgets.length)} />
              </div>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function BudgetStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-bg-subtle p-4">
      <p className="text-2xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text">{value}</p>
    </div>
  );
}
