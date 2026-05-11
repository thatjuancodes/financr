import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/api";
import Card from "@/components/base/Card";
import Navbar from "@/components/feature/Navbar";
import { EmptyState, LoadingState } from "@/components/feature/PageState";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import { formatCurrency } from "@/lib/finance";
import { AutomationContent } from "@/pages/automation/page";
import DebtSettingsSection from "@/pages/settings/components/DebtSettingsSection";
import { normalizeDefaultAccountPreferencesForEntity } from "@/utils/accounts";
import { CATEGORY_COLOR_SWATCHES, buildCategoryBadgeStyle, resolveCategoryColor } from "@/utils/categoryColors";
import type { CategoryRecord } from "@/types/finance";

type SettingsTab = "accounts" | "categories" | "budgets" | "debts" | "automation" | "app";
type CategoryDraft = {
  name: string;
  color: string | null;
  icon: string | null;
};
type EntityDraft = {
  name: string;
  type: string;
};
type AccountDraft = {
  name: string;
  entity_id: string;
  type: string;
  currency_code: string;
};
type DeleteEntityState = {
  id: string;
  name: string;
};

const SETTINGS_TABS: SettingsTab[] = ["accounts", "categories", "budgets", "debts", "automation", "app"];

const accountTypes = ["bank", "cash", "ewallet", "credit"];
const entityTypes = ["personal", "family", "business"];
const currencyOptions = ["PHP", "USD", "VND", "EUR", "GBP", "JPY", "AUD", "CAD"];
const CATEGORY_ICON_OPTIONS = [
  { value: null, label: "No icon", icon: "ri-shape-line" },
  { value: "ri-home-5-line", label: "Home", icon: "ri-home-5-line" },
  { value: "ri-shopping-bag-3-line", label: "Shopping", icon: "ri-shopping-bag-3-line" },
  { value: "ri-store-2-line", label: "Store", icon: "ri-store-2-line" },
  { value: "ri-restaurant-2-line", label: "Food", icon: "ri-restaurant-2-line" },
  { value: "ri-goblet-line", label: "Dining", icon: "ri-goblet-line" },
  { value: "ri-cup-line", label: "Coffee", icon: "ri-cup-line" },
  { value: "ri-bank-card-line", label: "Bills", icon: "ri-bank-card-line" },
  { value: "ri-file-list-3-line", label: "Utilities", icon: "ri-file-list-3-line" },
  { value: "ri-car-line", label: "Car", icon: "ri-car-line" },
  { value: "ri-gas-station-line", label: "Fuel", icon: "ri-gas-station-line" },
  { value: "ri-bus-line", label: "Transit", icon: "ri-bus-line" },
  { value: "ri-train-line", label: "Train", icon: "ri-train-line" },
  { value: "ri-heart-pulse-line", label: "Health", icon: "ri-heart-pulse-line" },
  { value: "ri-medicine-bottle-line", label: "Medical", icon: "ri-medicine-bottle-line" },
  { value: "ri-mental-health-line", label: "Wellness", icon: "ri-mental-health-line" },
  { value: "ri-graduation-cap-line", label: "Education", icon: "ri-graduation-cap-line" },
  { value: "ri-book-open-line", label: "Books", icon: "ri-book-open-line" },
  { value: "ri-movie-line", label: "Entertainment", icon: "ri-movie-line" },
  { value: "ri-gamepad-line", label: "Games", icon: "ri-gamepad-line" },
  { value: "ri-planet-line", label: "Subscriptions", icon: "ri-planet-line" },
  { value: "ri-plane-line", label: "Travel", icon: "ri-plane-line" },
  { value: "ri-hotel-bed-line", label: "Lodging", icon: "ri-hotel-bed-line" },
  { value: "ri-luggage-cart-line", label: "Trip", icon: "ri-luggage-cart-line" },
  { value: "ri-gift-line", label: "Gift", icon: "ri-gift-line" },
  { value: "ri-briefcase-4-line", label: "Work", icon: "ri-briefcase-4-line" },
  { value: "ri-money-dollar-circle-line", label: "Income", icon: "ri-money-dollar-circle-line" },
  { value: "ri-coins-line", label: "Cash", icon: "ri-coins-line" },
  { value: "ri-wallet-3-line", label: "Wallet", icon: "ri-wallet-3-line" },
  { value: "ri-safe-2-line", label: "Savings", icon: "ri-safe-2-line" },
  { value: "ri-scissors-cut-line", label: "Personal Care", icon: "ri-scissors-cut-line" },
  { value: "ri-shirt-line", label: "Clothing", icon: "ri-shirt-line" },
  { value: "ri-smartphone-line", label: "Phone", icon: "ri-smartphone-line" },
  { value: "ri-computer-line", label: "Tech", icon: "ri-computer-line" },
  { value: "ri-wifi-line", label: "Internet", icon: "ri-wifi-line" },
  { value: "ri-flashlight-line", label: "Power", icon: "ri-flashlight-line" },
];

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
    deleteLoanOriginConfig,
    deleteAccount,
    deleteBudget,
    deleteCategory,
    deleteEntity,
    deleteIncomeCategory,
    entities,
    incomeCategories,
    loanOriginConfigs,
    loading,
    saveLoanOriginConfig,
    setDefaultAccounts,
    setCurrency,
    settings,
    updateAccount,
    updateEntity,
    updateCategory,
    updateIncomeCategory,
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
  const [settingsAccounts, setSettingsAccounts] = useState<typeof accounts>([]);
  const [isSettingsAccountsLoading, setIsSettingsAccountsLoading] = useState(false);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [entityDraft, setEntityDraft] = useState<EntityDraft | null>(null);
  const [entityDrawerError, setEntityDrawerError] = useState("");
  const [isEntityDrawerSubmitting, setIsEntityDrawerSubmitting] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<number | null>(null);
  const [accountDraft, setAccountDraft] = useState<AccountDraft | null>(null);
  const [accountDrawerError, setAccountDrawerError] = useState("");
  const [isAccountDrawerSubmitting, setIsAccountDrawerSubmitting] = useState(false);
  const [accountDeleteConfirmName, setAccountDeleteConfirmName] = useState("");
  const [deletingAccountId, setDeletingAccountId] = useState<number | null>(null);
  const [expenseCategoryName, setExpenseCategoryName] = useState("");
  const [incomeCategoryName, setIncomeCategoryName] = useState("");
  const [activeExpenseCategoryId, setActiveExpenseCategoryId] = useState<number | null>(null);
  const [expenseCategoryDraft, setExpenseCategoryDraft] = useState<CategoryDraft | null>(null);
  const [expenseCategoryDrawerError, setExpenseCategoryDrawerError] = useState("");
  const [isExpenseCategoryDrawerSubmitting, setIsExpenseCategoryDrawerSubmitting] = useState(false);
  const [activeIncomeCategoryId, setActiveIncomeCategoryId] = useState<number | null>(null);
  const [incomeCategoryDraft, setIncomeCategoryDraft] = useState<CategoryDraft | null>(null);
  const [incomeCategoryDrawerError, setIncomeCategoryDrawerError] = useState("");
  const [isIncomeCategoryDrawerSubmitting, setIsIncomeCategoryDrawerSubmitting] = useState(false);
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
  const [defaultAccountsSubmittingEntityId, setDefaultAccountsSubmittingEntityId] =
    useState("");
  const [defaultAccountsError, setDefaultAccountsError] = useState("");
  const [pendingEntityDelete, setPendingEntityDelete] = useState<DeleteEntityState | null>(null);
  const [entityDeleteConfirmName, setEntityDeleteConfirmName] = useState("");
  const [entityDeleteError, setEntityDeleteError] = useState("");
  const [isEntityDeleteSubmitting, setIsEntityDeleteSubmitting] = useState(false);

  useEffect(() => {
    if (tab === "accounts") {
      void loadSettingsAccounts();
    }
  }, [tab]);

  const entityAccounts = useMemo(() => {
    return entities.map((entity) => ({
      entity,
      accounts: settingsAccounts.filter((account) => account.entity_id === entity.id),
    }));
  }, [entities, settingsAccounts]);
  const activeExpenseCategory = useMemo(
    () => categories.find((category) => category.id === activeExpenseCategoryId) || null,
    [activeExpenseCategoryId, categories]
  );
  const activeIncomeCategory = useMemo(
    () => incomeCategories.find((category) => category.id === activeIncomeCategoryId) || null,
    [activeIncomeCategoryId, incomeCategories]
  );

  async function updateEntityDefaultAccount(
    entityId: string,
    kind: "expense" | "income",
    value: string
  ) {
    if (!entityId) {
      return;
    }
    setDefaultAccountsSubmittingEntityId(entityId);
    setDefaultAccountsError("");
    try {
      await setDefaultAccounts({
        entity_id: entityId,
        [kind === "income" ? "default_income_account_id" : "default_expense_account_id"]:
          value ? Number(value) : null,
      });
    } catch (error: any) {
      setDefaultAccountsError(error?.message || "Failed to update default accounts");
    } finally {
      setDefaultAccountsSubmittingEntityId("");
    }
  }

  async function loadSettingsAccounts() {
    setIsSettingsAccountsLoading(true);
    try {
      const nextAccounts = await api.getAccounts();
      setSettingsAccounts(Array.isArray(nextAccounts) ? nextAccounts : []);
    } finally {
      setIsSettingsAccountsLoading(false);
    }
  }

  function openEntityDrawer(entity: { id: string; name: string; type: string }) {
    setActiveEntityId(entity.id);
    setEntityDrawerError("");
    setEntityDraft({
      name: entity.name,
      type: entity.type,
    });
  }

  function resetEntityDrawer() {
    setActiveEntityId(null);
    setEntityDraft(null);
    setEntityDrawerError("");
  }

  function closeEntityDrawer() {
    if (isEntityDrawerSubmitting) {
      return;
    }
    resetEntityDrawer();
  }

  async function submitEntityDrawer() {
    if (!activeEntityId || !entityDraft) {
      return;
    }
    setIsEntityDrawerSubmitting(true);
    setEntityDrawerError("");
    try {
      await updateEntity(activeEntityId, entityDraft);
      resetEntityDrawer();
    } catch (error: any) {
      setEntityDrawerError(error?.message || "Failed to update entity");
    } finally {
      setIsEntityDrawerSubmitting(false);
    }
  }

  function openEntityDeleteConfirmation(entity: { id: string; name: string }) {
    setPendingEntityDelete(entity);
    setEntityDeleteConfirmName("");
    setEntityDeleteError("");
    setIsEntityDeleteSubmitting(false);
  }

  function closeEntityDeleteConfirmation() {
    if (isEntityDeleteSubmitting) {
      return;
    }
    setPendingEntityDelete(null);
    setEntityDeleteConfirmName("");
    setEntityDeleteError("");
  }

  async function confirmEntityDelete() {
    if (!pendingEntityDelete) {
      return;
    }
    if (entityDeleteConfirmName !== pendingEntityDelete.name) {
      setEntityDeleteError("Type the exact entity name to continue.");
      return;
    }
    setIsEntityDeleteSubmitting(true);
    setEntityDeleteError("");
    try {
      await deleteEntity(pendingEntityDelete.id);
      closeEntityDeleteConfirmation();
    } catch (error: any) {
      setEntityDeleteError(error?.message || "Failed to delete entity");
      setIsEntityDeleteSubmitting(false);
    }
  }

  function openAccountDrawer(account: (typeof accounts)[number]) {
    setActiveAccountId(account.id);
    setAccountDrawerError("");
    setAccountDeleteConfirmName("");
    setDeletingAccountId(null);
    setAccountDraft({
      name: account.name,
      entity_id: account.entity_id,
      type: account.type,
      currency_code: account.currency_code,
    });
  }

  function resetAccountDrawer() {
    setActiveAccountId(null);
    setAccountDraft(null);
    setAccountDrawerError("");
    setAccountDeleteConfirmName("");
    setDeletingAccountId(null);
  }

  function closeAccountDrawer() {
    if (isAccountDrawerSubmitting) {
      return;
    }
    resetAccountDrawer();
  }

  async function submitAccountDrawer() {
    if (!activeAccountId || !accountDraft) {
      return;
    }
    setIsAccountDrawerSubmitting(true);
    setAccountDrawerError("");
    try {
      await updateAccount(activeAccountId, accountDraft);
      await loadSettingsAccounts();
      resetAccountDrawer();
    } catch (error: any) {
      setAccountDrawerError(error?.message || "Failed to update account");
    } finally {
      setIsAccountDrawerSubmitting(false);
    }
  }

  async function deleteAccountFromDrawer() {
    const account = settingsAccounts.find((item) => item.id === activeAccountId);
    if (!account) {
      return;
    }
    if (accountDeleteConfirmName !== account.name) {
      setAccountDrawerError("Type the exact account name to continue.");
      return;
    }
    setDeletingAccountId(account.id);
    setAccountDrawerError("");
    try {
      await deleteAccount(account.id);
      await loadSettingsAccounts();
      resetAccountDrawer();
    } catch (error: any) {
      setAccountDrawerError(error?.message || "Failed to delete account");
      setDeletingAccountId(null);
    }
  }

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

  function openExpenseCategoryDrawer(category: CategoryRecord) {
    setActiveExpenseCategoryId(category.id);
    setExpenseCategoryDrawerError("");
    setExpenseCategoryDraft({
      name: category.name,
      color: category.color || null,
      icon: category.icon || null,
    });
  }

  function resetExpenseCategoryDrawer() {
    setActiveExpenseCategoryId(null);
    setExpenseCategoryDraft(null);
    setExpenseCategoryDrawerError("");
  }

  function closeExpenseCategoryDrawer() {
    if (isExpenseCategoryDrawerSubmitting) {
      return;
    }
    resetExpenseCategoryDrawer();
  }

  function openIncomeCategoryDrawer(category: CategoryRecord) {
    setActiveIncomeCategoryId(category.id);
    setIncomeCategoryDrawerError("");
    setIncomeCategoryDraft({
      name: category.name,
      color: category.color || null,
      icon: category.icon || null,
    });
  }

  function resetIncomeCategoryDrawer() {
    setActiveIncomeCategoryId(null);
    setIncomeCategoryDraft(null);
    setIncomeCategoryDrawerError("");
  }

  function closeIncomeCategoryDrawer() {
    if (isIncomeCategoryDrawerSubmitting) {
      return;
    }
    resetIncomeCategoryDrawer();
  }

  async function submitExpenseCategoryDrawer() {
    if (!activeExpenseCategory || !expenseCategoryDraft) {
      return;
    }
    setIsExpenseCategoryDrawerSubmitting(true);
    setExpenseCategoryDrawerError("");
    try {
      await updateCategory(activeExpenseCategory.id, {
        name: expenseCategoryDraft.name,
        color: expenseCategoryDraft.color,
        icon: expenseCategoryDraft.icon,
      });
      resetExpenseCategoryDrawer();
    } catch (error: any) {
      setExpenseCategoryDrawerError(error?.message || "Failed to update category");
    } finally {
      setIsExpenseCategoryDrawerSubmitting(false);
    }
  }

  async function submitIncomeCategoryDrawer() {
    if (!activeIncomeCategory || !incomeCategoryDraft) {
      return;
    }
    setIsIncomeCategoryDrawerSubmitting(true);
    setIncomeCategoryDrawerError("");
    try {
      await updateIncomeCategory(activeIncomeCategory.id, {
        name: incomeCategoryDraft.name,
        color: incomeCategoryDraft.color,
        icon: incomeCategoryDraft.icon,
      });
      resetIncomeCategoryDrawer();
    } catch (error: any) {
      setIncomeCategoryDrawerError(error?.message || "Failed to update income category");
    } finally {
      setIsIncomeCategoryDrawerSubmitting(false);
    }
  }

  async function removeExpenseCategoryFromDrawer() {
    if (!activeExpenseCategory) {
      return;
    }
    setIsExpenseCategoryDrawerSubmitting(true);
    setExpenseCategoryDrawerError("");
    try {
      await deleteCategory(activeExpenseCategory.id);
      resetExpenseCategoryDrawer();
    } catch (error: any) {
      setExpenseCategoryDrawerError(error?.message || "Failed to delete category");
    } finally {
      setIsExpenseCategoryDrawerSubmitting(false);
    }
  }

  async function removeIncomeCategoryFromDrawer() {
    if (!activeIncomeCategory) {
      return;
    }
    setIsIncomeCategoryDrawerSubmitting(true);
    setIncomeCategoryDrawerError("");
    try {
      await deleteIncomeCategory(activeIncomeCategory.id);
      resetIncomeCategoryDrawer();
    } catch (error: any) {
      setIncomeCategoryDrawerError(error?.message || "Failed to delete income category");
    } finally {
      setIsIncomeCategoryDrawerSubmitting(false);
    }
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
                    await loadSettingsAccounts();
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
              <>
                {defaultAccountsError ? (
                  <Card className="border border-negative/20 bg-negative-light p-4 text-sm text-negative-dark">
                    {defaultAccountsError}
                  </Card>
                ) : null}
                {isSettingsAccountsLoading ? (
                  <Card className="p-4 text-sm text-text-secondary">
                    Loading all entity accounts...
                  </Card>
                ) : null}
                {entityAccounts.map(({ entity, accounts: scopedAccounts }) => {
                  const entityDefaults = normalizeDefaultAccountPreferencesForEntity(
                    settings,
                    scopedAccounts,
                    entity.id
                  );
                  const isSavingDefaults =
                    defaultAccountsSubmittingEntityId === entity.id;
                  const defaultExpenseId = String(
                    entityDefaults.default_expense_account_id || ""
                  );
                  const defaultIncomeId = String(
                    entityDefaults.default_income_account_id || ""
                  );

                  return (
                    <Card key={entity.id} className="p-5">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-text">{entity.name}</h3>
                          <p className="text-sm capitalize text-text-secondary">{entity.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEntityDrawer(entity)}
                            className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-text"
                          >
                            Edit Entity
                          </button>
                          <button
                            onClick={() => openEntityDeleteConfirmation(entity)}
                            className="rounded-md bg-negative-light px-3 py-1.5 text-sm font-medium text-negative-dark"
                          >
                            Delete entity
                          </button>
                        </div>
                      </div>
                      <div className="mb-4 grid gap-3 rounded-xl bg-bg-subtle p-4 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                            Default Expense Account
                          </span>
                          <select
                            value={defaultExpenseId}
                            disabled={isSavingDefaults || scopedAccounts.length === 0}
                            onChange={(event) => {
                              void updateEntityDefaultAccount(
                                entity.id,
                                "expense",
                                event.target.value
                              );
                            }}
                            className="w-full rounded-lg bg-white px-3 py-2.5 text-sm outline-none disabled:opacity-60"
                          >
                            {scopedAccounts.length === 0 ? (
                              <option value="">No accounts available</option>
                            ) : null}
                            {scopedAccounts.map((account) => (
                              <option key={`expense:${entity.id}:${account.id}`} value={String(account.id)}>
                                {account.name} • {account.currency_code}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                            Default Income Account
                          </span>
                          <select
                            value={defaultIncomeId}
                            disabled={isSavingDefaults || scopedAccounts.length === 0}
                            onChange={(event) => {
                              void updateEntityDefaultAccount(
                                entity.id,
                                "income",
                                event.target.value
                              );
                            }}
                            className="w-full rounded-lg bg-white px-3 py-2.5 text-sm outline-none disabled:opacity-60"
                          >
                            {scopedAccounts.length === 0 ? (
                              <option value="">No accounts available</option>
                            ) : null}
                            {scopedAccounts.map((account) => (
                              <option key={`income:${entity.id}:${account.id}`} value={String(account.id)}>
                                {account.name} • {account.currency_code}
                              </option>
                            ))}
                          </select>
                        </label>
                        {isSavingDefaults ? (
                          <p className="md:col-span-2 text-2xs text-text-secondary">
                            Saving default accounts...
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        {scopedAccounts.length === 0 ? (
                          <p className="text-sm text-text-secondary">No accounts yet.</p>
                        ) : (
                          scopedAccounts.map((account) => (
                            <button
                              key={account.id}
                              type="button"
                              onClick={() => openAccountDrawer(account)}
                              className="flex w-full items-center justify-between rounded-lg bg-bg-subtle px-4 py-3 text-left transition hover:bg-white"
                            >
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-medium text-text">{account.name}</p>
                                  {defaultExpenseId === String(account.id) ? (
                                    <span className="rounded-full bg-accent-light px-2 py-0.5 text-2xs font-medium text-accent-dark">
                                      Default expense
                                    </span>
                                  ) : null}
                                  {defaultIncomeId === String(account.id) ? (
                                    <span className="rounded-full bg-positive-light px-2 py-0.5 text-2xs font-medium text-positive-dark">
                                      Default income
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-2xs text-text-secondary">
                                  {account.type} • {account.currency_code}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-text">
                                  {formatCurrency(account.balance, account.currency_code)}
                                </span>
                                <i className="ri-arrow-right-s-line text-lg text-text-secondary" />
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </Card>
                  );
                })}
              </>
            )}
          </div>
        ) : null}

        {tab === "categories" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 text-lg font-semibold text-text">Expense Categories</h2>
              <p className="mb-4 text-sm text-text-secondary">
                Click any category to edit its name, color, or icon.
              </p>
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
              {categories.length === 0 ? (
                <EmptyState title="No expense categories" body="Add your first expense category to get started." />
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {categories.map((category) => (
                    <CategoryListRow
                      key={category.id}
                      category={category}
                      onClick={() => openExpenseCategoryDrawer(category)}
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-lg font-semibold text-text">Income Categories</h2>
              <p className="mb-4 text-sm text-text-secondary">
                Click any category to edit its name, color, or icon.
              </p>
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
              {incomeCategories.length === 0 ? (
                <EmptyState title="No income categories" body="Add your first income category to get started." />
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {incomeCategories.map((category) => (
                    <CategoryListRow
                      key={category.id}
                      category={category}
                      onClick={() => openIncomeCategoryDrawer(category)}
                    />
                  ))}
                </div>
              )}
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

        {tab === "debts" ? (
          <DebtSettingsSection
            loanOriginConfigs={loanOriginConfigs}
            onDeleteConfig={deleteLoanOriginConfig}
            onSaveConfig={saveLoanOriginConfig}
          />
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

      <SettingsCategoryDrawer
        activeCategory={activeExpenseCategory}
        colorSeedPrefix="expense"
        draft={expenseCategoryDraft}
        error={expenseCategoryDrawerError}
        isSubmitting={isExpenseCategoryDrawerSubmitting}
        onClose={closeExpenseCategoryDrawer}
        onDelete={removeExpenseCategoryFromDrawer}
        onDraftChange={setExpenseCategoryDraft}
        onSubmit={submitExpenseCategoryDrawer}
        title="Edit Expense Category"
      />

      <SettingsCategoryDrawer
        activeCategory={activeIncomeCategory}
        colorSeedPrefix="income"
        draft={incomeCategoryDraft}
        error={incomeCategoryDrawerError}
        isSubmitting={isIncomeCategoryDrawerSubmitting}
        onClose={closeIncomeCategoryDrawer}
        onDelete={removeIncomeCategoryFromDrawer}
        onDraftChange={setIncomeCategoryDraft}
        onSubmit={submitIncomeCategoryDrawer}
        title="Edit Income Category"
      />

      <SettingsEntityDrawer
        draft={entityDraft}
        error={entityDrawerError}
        isSubmitting={isEntityDrawerSubmitting}
        onClose={closeEntityDrawer}
        onDraftChange={setEntityDraft}
        onSubmit={submitEntityDrawer}
      />

      <SettingsAccountDrawer
        accountName={
          settingsAccounts.find((item) => item.id === activeAccountId)?.name || ""
        }
        draft={accountDraft}
        error={accountDrawerError}
        entities={entities}
        deleteConfirmName={accountDeleteConfirmName}
        deletingAccountId={deletingAccountId}
        isSubmitting={isAccountDrawerSubmitting}
        onClose={closeAccountDrawer}
        onDelete={deleteAccountFromDrawer}
        onDeleteConfirmNameChange={setAccountDeleteConfirmName}
        onDraftChange={setAccountDraft}
        onSubmit={submitAccountDrawer}
      />

      <DeleteConfirmationModal
        confirmValue={entityDeleteConfirmName}
        error={entityDeleteError}
        isSubmitting={isEntityDeleteSubmitting}
        itemLabel="entity"
        itemName={pendingEntityDelete?.name || ""}
        onClose={closeEntityDeleteConfirmation}
        onConfirm={confirmEntityDelete}
        onConfirmValueChange={setEntityDeleteConfirmName}
      />
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

function CategoryListRow({
  category,
  onClick,
}: {
  category: CategoryRecord;
  onClick: () => void;
}) {
  const color = resolveCategoryColor(category.color, `category:${category.id}:${category.name}`);
  const iconStyle = buildCategoryBadgeStyle(color);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left text-text shadow-sm transition hover:shadow-md"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
        style={iconStyle}
      >
        {category.icon ? (
          <i className={`${category.icon} text-lg`} />
        ) : (
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "currentColor" }} />
        )}
      </span>
      <span className="truncate text-base font-semibold">{category.name}</span>
    </button>
  );
}

function SettingsCategoryDrawer({
  activeCategory,
  colorSeedPrefix,
  draft,
  error,
  isSubmitting,
  onClose,
  onDelete,
  onDraftChange,
  onSubmit,
  title,
}: {
  activeCategory: CategoryRecord | null;
  colorSeedPrefix: string;
  draft: CategoryDraft | null;
  error: string;
  isSubmitting: boolean;
  onClose: () => void;
  onDelete: () => void;
  onDraftChange: Dispatch<SetStateAction<CategoryDraft | null>>;
  onSubmit: () => Promise<void>;
  title: string;
}) {
  if (!activeCategory || !draft) {
    return null;
  }

  const previewCategory: CategoryRecord = {
    id: activeCategory.id,
    name: draft.name,
    color: draft.color,
    icon: draft.icon,
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-slate-950/30"
      onClick={onClose}
    >
      <aside
        className="h-screen w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md bg-bg-subtle px-3 py-1.5 text-sm font-medium text-text-secondary disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await onSubmit();
          }}
          className="grid gap-4"
        >
          <label className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Name</span>
            <input
              type="text"
              value={draft.name}
              onChange={(event) =>
                onDraftChange((prev) =>
                  prev
                    ? {
                        ...prev,
                        name: event.target.value,
                      }
                    : prev
                )
              }
              required
              className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm text-text outline-none"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Color</span>
            <div className="grid grid-cols-7 gap-2">
              {CATEGORY_COLOR_SWATCHES.map((swatch) => {
                const isSelected = resolveCategoryColor(draft.color, `${colorSeedPrefix}:${activeCategory.id}`) === swatch;
                return (
                  <button
                    key={`${colorSeedPrefix}-${activeCategory.id}-${swatch}`}
                    type="button"
                    aria-label={`Use color ${swatch}`}
                    onClick={() =>
                      onDraftChange((prev) =>
                        prev
                          ? {
                              ...prev,
                              color: swatch,
                            }
                          : prev
                      )
                    }
                    className={`h-9 w-9 rounded-full border-2 transition ${isSelected ? "border-text shadow-sm" : "border-transparent"}`}
                    style={{ backgroundColor: swatch }}
                  />
                );
              })}
            </div>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Icon</span>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {CATEGORY_ICON_OPTIONS.map((option) => {
                const isSelected = (draft.icon || null) === option.value;
                return (
                  <button
                    key={`${colorSeedPrefix}-${activeCategory.id}-${option.icon}`}
                    type="button"
                    onClick={() =>
                      onDraftChange((prev) =>
                        prev
                          ? {
                              ...prev,
                              icon: option.value,
                            }
                          : prev
                      )
                    }
                    className={`flex aspect-square items-center justify-center rounded-md border transition ${
                      isSelected
                        ? "border-accent bg-accent-light text-accent-dark"
                        : "border-bg-subtle bg-white text-text-secondary hover:border-accent/40 hover:text-text"
                    }`}
                    aria-label={option.label}
                    title={option.label}
                  >
                    <i className={`${option.icon} text-3xl`} />
                  </button>
                );
              })}
            </div>
          </label>

          <div className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Preview</span>
            <CategoryBadgePreview
              category={previewCategory}
              colorKey={`${colorSeedPrefix}:${activeCategory.id}:${draft.name}`}
            />
          </div>

          {error ? (
            <p className="text-sm text-negative-dark">{error}</p>
          ) : null}

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onDelete}
              disabled={isSubmitting}
              className="mr-auto rounded-md bg-negative-light px-3 py-1.5 text-sm font-medium text-negative-dark disabled:opacity-60"
            >
              Delete
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function CategoryBadgePreview({
  category,
  colorKey,
}: {
  category: CategoryRecord;
  colorKey: string;
}) {
  const color = resolveCategoryColor(category.color, colorKey);
  const label = category.name.trim() || "Category";

  return (
    <span
      className="inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium"
      style={buildCategoryBadgeStyle(color)}
    >
      {category.icon ? <i className={`${category.icon} text-base`} /> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

function SettingsEntityDrawer({
  draft,
  error,
  isSubmitting,
  onClose,
  onDraftChange,
  onSubmit,
}: {
  draft: EntityDraft | null;
  error: string;
  isSubmitting: boolean;
  onClose: () => void;
  onDraftChange: Dispatch<SetStateAction<EntityDraft | null>>;
  onSubmit: () => Promise<void>;
}) {
  if (!draft) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-slate-950/30"
      onClick={onClose}
    >
      <aside
        className="h-screen w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Edit Entity"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text">Edit Entity</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md bg-bg-subtle px-3 py-1.5 text-sm font-medium text-text-secondary disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await onSubmit();
          }}
          className="grid gap-4"
        >
          <label className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Name</span>
            <input
              type="text"
              value={draft.name}
              onChange={(event) =>
                onDraftChange((prev) =>
                  prev
                    ? {
                        ...prev,
                        name: event.target.value,
                      }
                    : prev
                )
              }
              required
              className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm text-text outline-none"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Type</span>
            <select
              value={draft.type}
              onChange={(event) =>
                onDraftChange((prev) =>
                  prev
                    ? {
                        ...prev,
                        type: event.target.value,
                      }
                    : prev
                )
              }
              className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm text-text outline-none"
            >
              {entityTypes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="text-sm text-negative-dark">{error}</p> : null}

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function SettingsAccountDrawer({
  accountName,
  draft,
  deleteConfirmName,
  deletingAccountId,
  entities,
  error,
  isSubmitting,
  onClose,
  onDelete,
  onDeleteConfirmNameChange,
  onDraftChange,
  onSubmit,
}: {
  accountName: string;
  draft: AccountDraft | null;
  deleteConfirmName: string;
  deletingAccountId: number | null;
  entities: Array<{ id: string; name: string }>;
  error: string;
  isSubmitting: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
  onDeleteConfirmNameChange: (value: string) => void;
  onDraftChange: Dispatch<SetStateAction<AccountDraft | null>>;
  onSubmit: () => Promise<void>;
}) {
  if (!draft) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-slate-950/30"
      onClick={onClose}
    >
      <aside
        className="h-screen w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Edit Account"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text">Edit Account</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md bg-bg-subtle px-3 py-1.5 text-sm font-medium text-text-secondary disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await onSubmit();
          }}
          className="grid gap-4"
        >
          <label className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Name</span>
            <input
              type="text"
              value={draft.name}
              onChange={(event) =>
                onDraftChange((prev) =>
                  prev
                    ? {
                        ...prev,
                        name: event.target.value,
                      }
                    : prev
                )
              }
              required
              className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm text-text outline-none"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Entity</span>
            <select
              value={draft.entity_id}
              onChange={(event) =>
                onDraftChange((prev) =>
                  prev
                    ? {
                        ...prev,
                        entity_id: event.target.value,
                      }
                    : prev
                )
              }
              className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm text-text outline-none"
            >
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Type</span>
            <select
              value={draft.type}
              onChange={(event) =>
                onDraftChange((prev) =>
                  prev
                    ? {
                        ...prev,
                        type: event.target.value,
                      }
                    : prev
                )
              }
              className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm text-text outline-none"
            >
              {accountTypes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Currency</span>
            <select
              value={draft.currency_code}
              onChange={(event) =>
                onDraftChange((prev) =>
                  prev
                    ? {
                        ...prev,
                        currency_code: event.target.value,
                      }
                    : prev
                )
              }
              className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm text-text outline-none"
            >
              {currencyOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="text-sm text-negative-dark">{error}</p> : null}

          <div className="rounded-xl border border-negative/20 bg-negative-light/40 p-4">
            <p className="text-sm font-semibold text-negative-dark">Delete Account</p>
            <p className="mt-1 text-sm text-text-secondary">
              This action cannot be undone. Type the exact account name to enable deletion.
            </p>
            <label className="mt-3 grid gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                Confirm Account Name
              </span>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(event) => onDeleteConfirmNameChange(event.target.value)}
                placeholder={accountName}
                className="w-full rounded-lg bg-white px-3 py-2.5 text-sm text-text outline-none"
              />
            </label>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  await onDelete();
                }}
                disabled={
                  isSubmitting ||
                  deletingAccountId !== null ||
                  deleteConfirmName !== accountName
                }
                className="rounded-md bg-negative px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {deletingAccountId !== null ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function DeleteConfirmationModal({
  confirmValue,
  error,
  isSubmitting,
  itemLabel,
  itemName,
  onClose,
  onConfirm,
  onConfirmValueChange,
}: {
  confirmValue: string;
  error: string;
  isSubmitting: boolean;
  itemLabel: string;
  itemName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onConfirmValueChange: (value: string) => void;
}) {
  if (!itemName) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-text">Delete {itemLabel}</h3>
            <p className="mt-1 text-sm text-text-secondary">
              This action cannot be undone. Type the exact {itemLabel} name to continue.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md bg-bg-subtle px-3 py-1.5 text-sm font-medium text-text-secondary disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-negative/20 bg-negative-light/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Exact Name Required
          </p>
          <p className="mt-1 text-base font-semibold text-negative-dark">{itemName}</p>
        </div>

        <label className="mt-4 grid gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Confirm {itemLabel} name
          </span>
          <input
            type="text"
            value={confirmValue}
            onChange={(event) => onConfirmValueChange(event.target.value)}
            placeholder={itemName}
            className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm text-text outline-none"
          />
        </label>

        {error ? <p className="mt-3 text-sm text-negative-dark">{error}</p> : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md bg-bg-subtle px-3 py-1.5 text-sm font-medium text-text-secondary disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            disabled={isSubmitting || confirmValue !== itemName}
            className="rounded-md bg-negative px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? "Deleting..." : `Delete ${itemLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}
