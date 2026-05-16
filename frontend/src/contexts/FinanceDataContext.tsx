import React from "react";
import { api } from "@/api";
import { currentMonthKey } from "@/utils/format";
import {
  ALL_ENTITIES_ID,
  scopedTransactions as scopeTransactions,
} from "@/lib/finance";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type {
  AccountRecord,
  BalanceRecord,
  BudgetRecord,
  CategoryRecord,
  DebtRecord,
  EntityRecord,
  ExpenseRecord,
  IncomeRecord,
  LoanOriginConfigRecord,
  RecurringItemRecord,
  SettingsRecord,
  TransactionRecord,
} from "@/types/finance";

const STORAGE_KEY = "financr-v1-selected-entity";

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
  loanOriginConfigs: LoanOriginConfigRecord[];
  transactions: TransactionRecord[];
  recurringItems: RecurringItemRecord[];
  pendingRecurringItems: RecurringItemRecord[];
  categories: CategoryRecord[];
  incomeCategories: CategoryRecord[];
  budgets: BudgetRecord[];
  balance: BalanceRecord | null;
  scopedTransactions: TransactionRecord[];
  refresh: () => Promise<void>;
  clearNotice: () => void;
  createEntity: (payload: { name: string; type: string }) => Promise<void>;
  updateEntity: (id: string, payload: { name?: string; type?: string }) => Promise<void>;
  deleteEntity: (id: string) => Promise<void>;
  createAccount: (payload: Record<string, unknown>) => Promise<void>;
  updateAccount: (id: number, payload: Record<string, unknown>) => Promise<void>;
  deleteAccount: (id: number) => Promise<void>;
  createIncome: (payload: Record<string, unknown>) => Promise<void>;
  updateIncome: (id: number, payload: Record<string, unknown>) => Promise<void>;
  deleteIncome: (id: number) => Promise<void>;
  createExpense: (payload: Record<string, unknown>) => Promise<void>;
  updateExpense: (id: number, payload: Record<string, unknown>) => Promise<void>;
  deleteExpense: (id: number) => Promise<void>;
  createTransfer: (payload: Record<string, unknown>) => Promise<void>;
  updateTransfer: (id: string | number, payload: Record<string, unknown>) => Promise<void>;
  deleteTransfer: (id: string | number, params?: Record<string, unknown>) => Promise<void>;
  createDebt: (payload: Record<string, unknown>) => Promise<void>;
  updateDebt: (id: number, payload: Record<string, unknown>) => Promise<void>;
  deleteDebt: (id: number) => Promise<void>;
  payoffDebtByOrigin: (payload: Record<string, unknown>) => Promise<void>;
  updateTransaction: (id: string | number, payload: Record<string, unknown>) => Promise<void>;
  deleteTransaction: (id: string | number) => Promise<void>;
  createCategory: (payload: { name: string; color?: string | null; icon?: string | null }) => Promise<void>;
  updateCategory: (id: number, payload: { name?: string; color?: string | null; icon?: string | null }) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  createIncomeCategory: (payload: { name: string; color?: string | null; icon?: string | null }) => Promise<void>;
  updateIncomeCategory: (id: number, payload: { name?: string; color?: string | null; icon?: string | null }) => Promise<void>;
  deleteIncomeCategory: (id: number) => Promise<void>;
  createBudget: (payload: Record<string, unknown>) => Promise<void>;
  updateBudget: (id: number, payload: Record<string, unknown>) => Promise<void>;
  deleteBudget: (id: number) => Promise<void>;
  setDefaultAccounts: (payload: Record<string, unknown>) => Promise<void>;
  setCurrency: (code: string) => Promise<void>;
  confirmRecurring: (id: number) => Promise<void>;
  skipRecurring: (id: number) => Promise<void>;
  deleteRecurring: (id: number) => Promise<void>;
  currentMonth: string;
};

const FinanceDataContext = React.createContext<FinanceContextValue | null>(null);

function buildScopedEntityId(selectedEntityId: string) {
  return selectedEntityId && selectedEntityId !== ALL_ENTITIES_ID
    ? selectedEntityId
    : undefined;
}

export function FinanceDataProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, loading: authLoading } = useAuth();
  const { activeWorkspaceId, loading: workspaceLoading } = useWorkspace();
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
  const [loanOriginConfigs, setLoanOriginConfigs] = React.useState<LoanOriginConfigRecord[]>([]);
  const [transactions, setTransactions] = React.useState<TransactionRecord[]>([]);
  const [recurringItems, setRecurringItems] = React.useState<RecurringItemRecord[]>([]);
  const [pendingRecurringItems, setPendingRecurringItems] = React.useState<RecurringItemRecord[]>([]);
  const [categories, setCategories] = React.useState<CategoryRecord[]>([]);
  const [incomeCategories, setIncomeCategories] = React.useState<CategoryRecord[]>([]);
  const [budgets, setBudgets] = React.useState<BudgetRecord[]>([]);
  const [balance, setBalance] = React.useState<BalanceRecord | null>(null);

  const currentMonth = currentMonthKey();

  const setSelectedEntityId = React.useCallback((value: string) => {
    const nextValue = value || ALL_ENTITIES_ID;
    window.localStorage.setItem(STORAGE_KEY, nextValue);
    setSelectedEntityIdState(nextValue);
  }, []);

  const refresh = React.useCallback(async () => {
    if (!currentUser || !activeWorkspaceId) {
      setSettings(null);
      setEntities([]);
      setAccounts([]);
      setIncomeList([]);
      setExpenseList([]);
      setDebtList([]);
      setLoanOriginConfigs([]);
      setTransactions([]);
      setRecurringItems([]);
      setPendingRecurringItems([]);
      setCategories([]);
      setIncomeCategories([]);
      setBudgets([]);
      setBalance(null);
      setLoading(false);
      setError("");
      return;
    }
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
        nextLoanOriginConfigs,
        nextTransactions,
        nextRecurringItems,
        nextPendingRecurringItems,
        nextCategories,
        nextIncomeCategories,
        nextBudgets,
        nextBalance,
      ] = await Promise.all([
        api.getSettings(),
        api.getEntities(),
        api.getAccounts(entityId ? { entity_id: entityId } : {}),
        api.getIncome(entityId ? { entity_id: entityId } : {}),
        api.getExpenses(entityId ? { entity_id: entityId } : {}),
        api.getDebts(entityId ? { entity_id: entityId } : {}),
        api.getLoanOriginConfigs(entityId ? { entity_id: entityId } : {}),
        api.getTransactions(),
        api.getRecurringItems(entityId ? { entity_id: entityId } : {}),
        api.getPendingRecurringItems(entityId ? { entity_id: entityId } : {}),
        api.getCategories(),
        api.getIncomeCategories(),
        api.getBudgets(entityId ? { entity_id: entityId } : {}),
        api.getBalance(entityId ? { entity_id: entityId } : {}),
      ]);

      setSettings(nextSettings);
      setEntities(nextEntities);
      setAccounts(nextAccounts);
      setIncomeList(nextIncomeList);
      setExpenseList(nextExpenseList);
      setDebtList(nextDebts);
      setLoanOriginConfigs(nextLoanOriginConfigs);
      setTransactions(nextTransactions);
      setRecurringItems(nextRecurringItems);
      setPendingRecurringItems(nextPendingRecurringItems);
      setCategories(nextCategories);
      setIncomeCategories(nextIncomeCategories);
      setBudgets(nextBudgets);
      setBalance(nextBalance);
    } catch (nextError: any) {
      setError(nextError?.message || "Failed to load finance data");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, currentUser, selectedEntityId]);

  React.useEffect(() => {
    if (authLoading || workspaceLoading) {
      return;
    }
    void refresh();
  }, [authLoading, workspaceLoading, refresh]);

  React.useEffect(() => {
    if (
      selectedEntityId !== ALL_ENTITIES_ID &&
      entities.length > 0 &&
      !entities.some((entity) => entity.id === selectedEntityId)
    ) {
      setSelectedEntityId(ALL_ENTITIES_ID);
    }
  }, [entities, selectedEntityId, setSelectedEntityId]);

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
    loanOriginConfigs,
    transactions,
    recurringItems,
    pendingRecurringItems,
    categories,
    incomeCategories,
    budgets,
    balance,
    scopedTransactions: scopeTransactions(transactions, selectedEntityId),
    refresh,
    clearNotice: () => setNotice(""),
    createEntity: (payload) => runMutation(() => api.createEntity(payload), "Entity created"),
    updateEntity: (id, payload) =>
      runMutation(() => api.updateEntity(id, payload), "Entity updated"),
    deleteEntity: async (id) => {
      await runMutation(() => api.deleteEntity(id), "Entity deleted");
      if (selectedEntityId === id) {
        setSelectedEntityId(ALL_ENTITIES_ID);
      }
    },
    createAccount: (payload) => runMutation(() => api.createAccount(payload), "Account created"),
    updateAccount: (id, payload) =>
      runMutation(() => api.updateAccount(id, payload), "Account updated"),
    deleteAccount: (id) => runMutation(() => api.deleteAccount(id), "Account deleted"),
    createIncome: (payload) => runMutation(() => api.addIncome(payload), "Income created"),
    updateIncome: (id, payload) => runMutation(() => api.updateIncome(id, payload), "Income updated"),
    deleteIncome: (id) => runMutation(() => api.deleteIncome(id), "Income deleted"),
    createExpense: (payload) => runMutation(() => api.addExpense(payload), "Expense created"),
    updateExpense: (id, payload) =>
      runMutation(() => api.updateExpense(id, payload), "Expense updated"),
    deleteExpense: (id) => runMutation(() => api.deleteExpense(id), "Expense deleted"),
    createTransfer: (payload) => runMutation(() => api.createTransfer(payload), "Transfer created"),
    updateTransfer: (id, payload) =>
      runMutation(() => api.updateTransfer(id, payload), "Transfer updated"),
    deleteTransfer: (id, params = {}) =>
      runMutation(() => api.deleteTransfer(id, params), "Transfer deleted"),
    createDebt: (payload) => runMutation(() => api.addDebt(payload), "Debt created"),
    updateDebt: (id, payload) => runMutation(() => api.updateDebt(id, payload), "Debt updated"),
    deleteDebt: (id) => runMutation(() => api.deleteDebt(id), "Debt deleted"),
    payoffDebtByOrigin: (payload) =>
      runMutation(() => api.payoffDebtByOrigin(payload), "Debt payment recorded"),
    updateTransaction: (id, payload) =>
      runMutation(() => api.updateTransaction(id, payload), "Transaction updated"),
    deleteTransaction: (id) =>
      runMutation(() => api.deleteTransaction(id), "Transaction deleted"),
    createCategory: (payload) => runMutation(() => api.addCategory(payload), "Expense category created"),
    updateCategory: (id, payload) =>
      runMutation(() => api.updateCategory(id, payload), "Expense category updated"),
    deleteCategory: (id) => runMutation(() => api.deleteCategory(id), "Expense category deleted"),
    createIncomeCategory: (payload) =>
      runMutation(() => api.addIncomeCategory(payload), "Income category created"),
    updateIncomeCategory: (id, payload) =>
      runMutation(() => api.updateIncomeCategoryRecord(id, payload), "Income category updated"),
    deleteIncomeCategory: (id) =>
      runMutation(() => api.deleteIncomeCategory(id), "Income category deleted"),
    createBudget: (payload) => runMutation(() => api.addBudget(payload), "Budget created"),
    updateBudget: (id, payload) =>
      runMutation(() => api.updateBudget(id, payload), "Budget updated"),
    deleteBudget: (id) => runMutation(() => api.deleteBudget(id), "Budget deleted"),
    setDefaultAccounts: (payload) =>
      runMutation(() => api.setDefaultAccounts(payload), "Default accounts updated"),
    setCurrency: (code) => runMutation(() => api.setCurrency(code), "Currency updated"),
    confirmRecurring: (id) =>
      runMutation(() => api.confirmRecurringItem(id), "Recurring item confirmed"),
    skipRecurring: (id) => runMutation(() => api.skipRecurringItem(id), "Recurring item skipped"),
    deleteRecurring: (id) => runMutation(() => api.deleteRecurringItem(id), "Recurring item deleted"),
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
    loanOriginConfigs,
    notice,
    pendingRecurringItems,
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
