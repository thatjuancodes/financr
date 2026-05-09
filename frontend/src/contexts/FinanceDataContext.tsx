import React from "react";
import { api } from "@/api";
import { currentMonthKey } from "@/utils/format";
import {
  ALL_ENTITIES_ID,
  scopedTransactions as scopeTransactions,
} from "@/lib/finance";
import type {
  AccountRecord,
  BalanceRecord,
  BudgetRecord,
  CategoryRecord,
  DebtRecord,
  EntityRecord,
  ExpenseRecord,
  IncomeRecord,
  ProjectionScenarioDetail,
  ProjectionScenarioRecord,
  RecurringItemRecord,
  SettingsRecord,
  TransactionRecord,
} from "@/types/finance";

const STORAGE_KEY = "financr-v1-selected-entity";
const DEFAULT_WORKSPACE_ID = "default";

type FinanceContextValue = {
  loading: boolean;
  error: string;
  notice: string;
  selectedEntityId: string;
  setSelectedEntityId: (value: string) => void;
  settings: SettingsRecord | null;
  entities: EntityRecord[];
  accounts: AccountRecord[];
  incomeList: IncomeRecord[];
  expenseList: ExpenseRecord[];
  debtList: DebtRecord[];
  transactions: TransactionRecord[];
  recurringItems: RecurringItemRecord[];
  pendingRecurringItems: RecurringItemRecord[];
  categories: CategoryRecord[];
  incomeCategories: CategoryRecord[];
  budgets: BudgetRecord[];
  balance: BalanceRecord | null;
  projectionScenarios: ProjectionScenarioRecord[];
  scopedTransactions: TransactionRecord[];
  refresh: () => Promise<void>;
  clearNotice: () => void;
  createEntity: (payload: { name: string; type: string }) => Promise<void>;
  deleteEntity: (id: string) => Promise<void>;
  createAccount: (payload: Record<string, unknown>) => Promise<void>;
  deleteAccount: (id: number) => Promise<void>;
  createCategory: (payload: { name: string }) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  createIncomeCategory: (payload: { name: string }) => Promise<void>;
  deleteIncomeCategory: (id: number) => Promise<void>;
  createBudget: (payload: Record<string, unknown>) => Promise<void>;
  deleteBudget: (id: number) => Promise<void>;
  setCurrency: (code: string) => Promise<void>;
  confirmRecurring: (id: number) => Promise<void>;
  skipRecurring: (id: number) => Promise<void>;
  deleteRecurring: (id: number) => Promise<void>;
  loadProjectionScenario: (id: string) => Promise<ProjectionScenarioDetail>;
  previewProjectionScenario: (payload: Record<string, unknown>) => Promise<any>;
  createProjectionScenario: (payload: Record<string, unknown>) => Promise<void>;
  updateProjectionScenario: (id: string, payload: Record<string, unknown>) => Promise<void>;
  deleteProjectionScenario: (id: string) => Promise<void>;
  duplicateProjectionScenario: (id: string) => Promise<void>;
  currentMonth: string;
};

const FinanceDataContext = React.createContext<FinanceContextValue | null>(null);

function buildScopedEntityId(selectedEntityId: string) {
  return selectedEntityId && selectedEntityId !== ALL_ENTITIES_ID
    ? selectedEntityId
    : undefined;
}

export function FinanceDataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [selectedEntityId, setSelectedEntityIdState] = React.useState(() => {
    return window.localStorage.getItem(STORAGE_KEY) || ALL_ENTITIES_ID;
  });
  const [settings, setSettings] = React.useState<SettingsRecord | null>(null);
  const [entities, setEntities] = React.useState<EntityRecord[]>([]);
  const [accounts, setAccounts] = React.useState<AccountRecord[]>([]);
  const [incomeList, setIncomeList] = React.useState<IncomeRecord[]>([]);
  const [expenseList, setExpenseList] = React.useState<ExpenseRecord[]>([]);
  const [debtList, setDebtList] = React.useState<DebtRecord[]>([]);
  const [transactions, setTransactions] = React.useState<TransactionRecord[]>([]);
  const [recurringItems, setRecurringItems] = React.useState<RecurringItemRecord[]>([]);
  const [pendingRecurringItems, setPendingRecurringItems] = React.useState<RecurringItemRecord[]>([]);
  const [categories, setCategories] = React.useState<CategoryRecord[]>([]);
  const [incomeCategories, setIncomeCategories] = React.useState<CategoryRecord[]>([]);
  const [budgets, setBudgets] = React.useState<BudgetRecord[]>([]);
  const [balance, setBalance] = React.useState<BalanceRecord | null>(null);
  const [projectionScenarios, setProjectionScenarios] = React.useState<ProjectionScenarioRecord[]>([]);

  const currentMonth = currentMonthKey();

  const setSelectedEntityId = React.useCallback((value: string) => {
    const nextValue = value || ALL_ENTITIES_ID;
    window.localStorage.setItem(STORAGE_KEY, nextValue);
    setSelectedEntityIdState(nextValue);
  }, []);

  const refresh = React.useCallback(async () => {
    const entityId = buildScopedEntityId(selectedEntityId);
    setLoading(true);
    setError("");
    try {
      const [
        nextSettings,
        nextEntities,
        nextAccounts,
        nextIncomeList,
        nextExpenseList,
        nextDebts,
        nextTransactions,
        nextRecurringItems,
        nextPendingRecurringItems,
        nextCategories,
        nextIncomeCategories,
        nextBudgets,
        nextBalance,
        nextProjectionScenarios,
      ] = await Promise.all([
        api.getSettings(),
        api.getEntities(),
        api.getAccounts(entityId ? { entity_id: entityId } : {}),
        api.getIncome(entityId ? { entity_id: entityId } : {}),
        api.getExpenses(entityId ? { entity_id: entityId } : {}),
        api.getDebts(entityId ? { entity_id: entityId } : {}),
        api.getTransactions(),
        api.getRecurringItems(entityId ? { entity_id: entityId } : {}),
        api.getPendingRecurringItems(entityId ? { entity_id: entityId } : {}),
        api.getCategories(),
        api.getIncomeCategories(),
        api.getBudgets(entityId ? { entity_id: entityId } : {}),
        api.getBalance(entityId ? { entity_id: entityId } : {}),
        api.getProjectionScenarios(
          entityId
            ? { workspace_id: DEFAULT_WORKSPACE_ID, entity_id: entityId }
            : { workspace_id: DEFAULT_WORKSPACE_ID }
        ),
      ]);

      setSettings(nextSettings);
      setEntities(nextEntities);
      setAccounts(nextAccounts);
      setIncomeList(nextIncomeList);
      setExpenseList(nextExpenseList);
      setDebtList(nextDebts);
      setTransactions(nextTransactions);
      setRecurringItems(nextRecurringItems);
      setPendingRecurringItems(nextPendingRecurringItems);
      setCategories(nextCategories);
      setIncomeCategories(nextIncomeCategories);
      setBudgets(nextBudgets);
      setBalance(nextBalance);
      setProjectionScenarios(nextProjectionScenarios);
    } catch (nextError: any) {
      setError(nextError?.message || "Failed to load finance data");
    } finally {
      setLoading(false);
    }
  }, [selectedEntityId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const runMutation = React.useCallback(async (action: () => Promise<any>, successMessage: string) => {
    setError("");
    try {
      await action();
      setNotice(successMessage);
      await refresh();
    } catch (nextError: any) {
      setError(nextError?.message || "Request failed");
      throw nextError;
    }
  }, [refresh]);

  const contextValue = React.useMemo<FinanceContextValue>(() => ({
    loading,
    error,
    notice,
    selectedEntityId,
    setSelectedEntityId,
    settings,
    entities,
    accounts,
    incomeList,
    expenseList,
    debtList,
    transactions,
    recurringItems,
    pendingRecurringItems,
    categories,
    incomeCategories,
    budgets,
    balance,
    projectionScenarios,
    scopedTransactions: scopeTransactions(transactions, selectedEntityId),
    refresh,
    clearNotice: () => setNotice(""),
    createEntity: (payload) => runMutation(() => api.createEntity(payload), "Entity created"),
    deleteEntity: async (id) => {
      await runMutation(() => api.deleteEntity(id), "Entity deleted");
      if (selectedEntityId === id) {
        setSelectedEntityId(ALL_ENTITIES_ID);
      }
    },
    createAccount: (payload) => runMutation(() => api.createAccount(payload), "Account created"),
    deleteAccount: (id) => runMutation(() => api.deleteAccount(id), "Account deleted"),
    createCategory: (payload) => runMutation(() => api.addCategory(payload), "Expense category created"),
    deleteCategory: (id) => runMutation(() => api.deleteCategory(id), "Expense category deleted"),
    createIncomeCategory: (payload) =>
      runMutation(() => api.addIncomeCategory(payload), "Income category created"),
    deleteIncomeCategory: (id) =>
      runMutation(() => api.deleteIncomeCategory(id), "Income category deleted"),
    createBudget: (payload) => runMutation(() => api.addBudget(payload), "Budget created"),
    deleteBudget: (id) => runMutation(() => api.deleteBudget(id), "Budget deleted"),
    setCurrency: (code) => runMutation(() => api.setCurrency(code), "Currency updated"),
    confirmRecurring: (id) =>
      runMutation(() => api.confirmRecurringItem(id), "Recurring item confirmed"),
    skipRecurring: (id) => runMutation(() => api.skipRecurringItem(id), "Recurring item skipped"),
    deleteRecurring: (id) => runMutation(() => api.deleteRecurringItem(id), "Recurring item deleted"),
    loadProjectionScenario: (id) => api.getProjectionScenario(id),
    previewProjectionScenario: (payload) => api.previewProjectionScenario(payload),
    createProjectionScenario: (payload) =>
      runMutation(() => api.createProjectionScenario(payload), "Projection created"),
    updateProjectionScenario: (id, payload) =>
      runMutation(() => api.updateProjectionScenario(id, payload), "Projection updated"),
    deleteProjectionScenario: (id) =>
      runMutation(() => api.deleteProjectionScenario(id), "Projection deleted"),
    duplicateProjectionScenario: (id) =>
      runMutation(() => api.duplicateProjectionScenario(id), "Projection duplicated"),
    currentMonth,
  }), [
    accounts,
    balance,
    budgets,
    categories,
    currentMonth,
    debtList,
    expenseList,
    entities,
    error,
    incomeList,
    incomeCategories,
    loading,
    notice,
    pendingRecurringItems,
    projectionScenarios,
    recurringItems,
    refresh,
    runMutation,
    selectedEntityId,
    setSelectedEntityId,
    settings,
    transactions,
  ]);

  return (
    <FinanceDataContext.Provider value={contextValue}>
      {children}
    </FinanceDataContext.Provider>
  );
}

export function useFinanceData() {
  const value = React.useContext(FinanceDataContext);
  if (!value) {
    throw new Error("useFinanceData must be used within FinanceDataProvider");
  }
  return value;
}
