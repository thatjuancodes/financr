import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api";
import Badge from "@/components/base/Badge";
import Card from "@/components/base/Card";
import Navbar from "@/components/feature/Navbar";
import { EmptyState, LoadingState } from "@/components/feature/PageState";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import { ALL_ENTITIES_ID, formatCurrency, formatLongDate, formatShortDate, monthKey, sortByDateDesc } from "@/lib/finance";
import DebtStatementsView from "@/pages/transactions/components/DebtStatementsView";
import type { CategoryRecord } from "@/types/finance";
import { buildDebtCycleMonthsFromData } from "@/utils/appState";
import { createTransferDraft as createDefaultTransferDraft } from "@/utils/accounts";
import { buildCategoryBadgeStyle, resolveCategoryColor } from "@/utils/categoryColors";
import { monthLabel } from "@/utils/format";

type FilterType = "all" | "income" | "expense" | "transfer" | "debt";
type ExpenseExpectation = "expected" | "unexpected";
type TransactionListRow = {
  id: string | number;
  source_type: string;
  type: FilterType;
  amount: number;
  from_account_id?: number | null;
  to_account_id?: number | null;
  from_account_name?: string | null;
  to_account_name?: string | null;
  from_entity_name?: string | null;
  to_entity_name?: string | null;
  currency_code?: string | null;
  category?: string | null;
  note?: string | null;
  created_at: string;
};

type CategoryMeta = {
  label: string;
  color: string;
  icon: string | null;
};

type ComparisonMeta = {
  direction: "down" | "flat" | "up";
  percentageLabel: string;
};

type GroupBy = "category" | "date" | "type";
type SortOrder = "amount_asc" | "amount_desc" | "date_asc" | "date_desc";
type DrawerTransactionType = "debt" | "expense" | "income" | "transfer";
type DrawerMode = "create" | "edit";
type EditableSourceType =
  | "debt"
  | "expense"
  | "legacy_expense"
  | "legacy_income"
  | "legacy_transaction"
  | "transaction"
  | "transfer";

type ExpenseDraft = {
  amount: string;
  entity_id: string;
  expense_category_id: string;
  expense_expectation: ExpenseExpectation;
  from_account_id: string;
  name: string;
  notes: string;
  spent_at: string;
};

type IncomeDraft = {
  amount: string;
  entity_id: string;
  income_category_id: string;
  received_date: string;
  source: string;
  to_account_id: string;
};

type TransferDraft = {
  amount: string;
  date: string;
  expense_category_id: string;
  from_account_id: string;
  income_category_id: string;
  mirror_as_income_expense: boolean;
  notes: string;
  to_account_id: string;
  transfer_fee_amount: string;
};

type DebtDraft = {
  amount: string;
  debt_category_id: string;
  entity_id: string;
  loan_origin: string;
  name: string;
  notes: string;
  spent_at: string;
  statement_month: string;
};

type GenericTransactionDraft = {
  amount: string;
  category: string;
  created_at: string;
  from_account_id: string;
  note: string;
  to_account_id: string;
  type: "income" | "expense" | "transfer";
};

type EditTarget =
  | {
      kind: "expense" | "income" | "debt";
      id: number;
    }
  | {
      kind: "transaction" | "transfer";
      id: string;
    };

export default function Transactions() {
  const {
    accounts,
    balance,
    categories,
    createDebt,
    createExpense,
    createIncome,
    createTransfer,
    currentMonth,
    debtList,
    deleteDebt,
    deleteExpense,
    deleteIncome,
    deleteTransaction,
    deleteTransfer,
    entities,
    expenseList,
    incomeList,
    incomeCategories,
    loanOriginConfigs,
    loading,
    payoffDebtByOrigin,
    selectedEntityId,
    settings,
    scopedTransactions,
    updateDebt,
    updateExpense,
    updateIncome,
    updateTransaction,
    updateTransfer,
  } = useFinanceData();
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<FilterType>("expense");
  const [expandedId, setExpandedId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("date_desc");
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("date");
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const [isFilterDocked, setIsFilterDocked] = useState(false);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create");
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [drawerTransactionType, setDrawerTransactionType] = useState<DrawerTransactionType>("expense");
  const [drawerError, setDrawerError] = useState("");
  const [isDrawerSubmitting, setIsDrawerSubmitting] = useState(false);
  const [activeRowActionId, setActiveRowActionId] = useState("");
  const [isGenericEditDrawerOpen, setIsGenericEditDrawerOpen] = useState(false);
  const [genericEditTarget, setGenericEditTarget] = useState<EditTarget | null>(null);
  const [genericEditError, setGenericEditError] = useState("");
  const [isGenericEditSubmitting, setIsGenericEditSubmitting] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const monthMenuRef = useRef<HTMLDivElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const groupMenuRef = useRef<HTMLDivElement | null>(null);
  const filterAnchorRef = useRef<HTMLDivElement | null>(null);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(() =>
    createEmptyExpenseDraft("")
  );
  const [incomeDraft, setIncomeDraft] = useState<IncomeDraft>(() =>
    createEmptyIncomeDraft("")
  );
  const [transferDraft, setTransferDraft] = useState<TransferDraft>(() =>
    createEmptyTransferDraft(accounts)
  );
  const [debtDraft, setDebtDraft] = useState<DebtDraft>(() =>
    createEmptyDebtDraft("")
  );
  const [genericTransactionDraft, setGenericTransactionDraft] = useState<GenericTransactionDraft>(
    () => createEmptyGenericTransactionDraft("expense")
  );
  const [transferEditDraft, setTransferEditDraft] = useState<TransferDraft>(() =>
    createEmptyTransferDraft(accounts)
  );

  const currency = balance?.currency_code || "PHP";
  const defaultEntityId =
    selectedEntityId !== ALL_ENTITIES_ID ? selectedEntityId : entities[0]?.id || "";
  const sortedTransactions = useMemo(
    () => sortByDateDesc(scopedTransactions, "created_at"),
    [scopedTransactions]
  );
  const expenseRows = useMemo<TransactionListRow[]>(
    () =>
      sortByDateDesc(
        expenseList.map((expense) => {
          const categoryLabel =
            expense.expense_category_name || expense.name || "Uncategorized";
          const isTransferFee =
            String(expense.name || "").trim().toLowerCase() === "transfer fee";

          return {
            id: `expense:${expense.id}`,
            source_type: "expense",
            type: "expense" as const,
            amount: Number(expense.amount || 0),
            from_account_name: expense.from_account_name || null,
            to_account_name: null,
            from_entity_name: expense.entity_name || null,
            to_entity_name: null,
            currency_code: balance?.currency_code || "PHP",
            category: categoryLabel,
            note: isTransferFee
              ? categoryLabel
              : expense.notes
                ? `${expense.name || expense.expense_category_name || "Expense"} - ${expense.notes}`
                : expense.name || expense.expense_category_name || "Expense",
            created_at: expense.spent_at,
          };
        }),
        "created_at"
      ),
    [balance?.currency_code, expenseList]
  );
  const debtRows = useMemo<TransactionListRow[]>(
    () =>
      sortByDateDesc(
        debtList.map((debt) => ({
          id: `debt:${debt.id}`,
          source_type: "debt",
          type: "debt" as const,
          amount: Number(debt.amount || 0),
          from_account_name: null,
          to_account_name: null,
          from_entity_name: debt.entity_name || null,
          to_entity_name: null,
          currency_code: balance?.currency_code || "PHP",
          category: debt.debt_category_name || debt.loan_origin || "Debt",
          note: debt.notes
            ? `${debt.name || debt.debt_category_name || "Debt"} - ${debt.notes}`
            : debt.name || debt.debt_category_name || "Debt",
          created_at: debt.spent_at,
        })),
        "created_at"
      ),
    [balance?.currency_code, debtList]
  );
  const allRows = useMemo<TransactionListRow[]>(
    () => sortByDateDesc([...sortedTransactions, ...debtRows], "created_at"),
    [debtRows, sortedTransactions]
  );
  const incomeRows = useMemo<TransactionListRow[]>(
    () =>
      sortByDateDesc(
        sortedTransactions.filter((transaction) => transaction.type === "income"),
        "created_at"
      ),
    [sortedTransactions]
  );
  const transferRows = useMemo<TransactionListRow[]>(
    () =>
      sortByDateDesc(
        sortedTransactions.filter((transaction) => transaction.type === "transfer"),
        "created_at"
      ),
    [sortedTransactions]
  );
  const sourceRows =
    activeType === "expense"
      ? expenseRows
      : activeType === "income"
        ? incomeRows
        : activeType === "transfer"
          ? transferRows
      : activeType === "debt"
        ? debtRows
        : allRows;
  const monthOptions = useMemo(
    () =>
      Array.from(
        new Set([
          currentMonth,
          ...allRows.map((transaction) => monthKey(transaction.created_at)),
          ...expenseRows.map((transaction) => monthKey(transaction.created_at)),
          ...debtRows.map((transaction) => monthKey(transaction.created_at)),
        ])
      )
        .filter(Boolean)
        .sort((left, right) => right.localeCompare(left)),
    [allRows, currentMonth, debtRows, expenseRows]
  );
  const expenseCategoryMetaByName = useMemo(
    () => buildCategoryMetaByName(categories, "expense-category"),
    [categories]
  );
  const incomeCategoryMetaByName = useMemo(
    () => buildCategoryMetaByName(incomeCategories, "income-category"),
    [incomeCategories]
  );
  const categoryFilters = useMemo(() => {
    return Array.from(
      new Set(
        sourceRows.map((transaction) => String(transaction.category || "Uncategorized"))
      )
    ).sort();
  }, [sourceRows]);
  const loanOriginOptions = useMemo(() => {
    const origins = new Set<string>();
    debtList.forEach((debt) => {
      const loanOrigin = String(debt.loan_origin || "").trim();
      if (loanOrigin) {
        origins.add(loanOrigin);
      }
    });
    loanOriginConfigs.forEach((config) => {
      const loanOrigin = String(config.loan_origin || "").trim();
      if (loanOrigin) {
        origins.add(loanOrigin);
      }
    });
    return Array.from(origins).sort((left, right) => left.localeCompare(right));
  }, [debtList, loanOriginConfigs]);
  const debtCycleMonths = useMemo(
    () => buildDebtCycleMonthsFromData(debtList, loanOriginConfigs),
    [debtList, loanOriginConfigs]
  );
  const selectedCategorySet = useMemo(
    () => new Set(selectedCategories),
    [selectedCategories]
  );

  useEffect(() => {
    setSelectedCategories((current) =>
      current.filter((category) => categoryFilters.includes(category))
    );
  }, [categoryFilters]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!categoryMenuRef.current?.contains(event.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
      if (!monthMenuRef.current?.contains(event.target as Node)) {
        setIsMonthMenuOpen(false);
      }
      if (!sortMenuRef.current?.contains(event.target as Node)) {
        setIsSortMenuOpen(false);
      }
      if (!groupMenuRef.current?.contains(event.target as Node)) {
        setIsGroupMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    function handleFilterDockedState() {
      const anchorTop = filterAnchorRef.current?.getBoundingClientRect().top ?? 0;
      const shouldDock = window.scrollY > 0 && anchorTop <= 0;
      setIsFilterDocked(shouldDock);
    }

    window.addEventListener("scroll", handleFilterDockedState, { passive: true });
    window.addEventListener("resize", handleFilterDockedState);
    return () => {
      window.removeEventListener("scroll", handleFilterDockedState);
      window.removeEventListener("resize", handleFilterDockedState);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("transactions-filter-docked-change", {
        detail: { docked: isFilterDocked },
      })
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("transactions-filter-docked-change", {
          detail: { docked: false },
        })
      );
    };
  }, [isFilterDocked]);

  function resetAddDrawerState(nextType: DrawerTransactionType) {
    setDrawerMode("create");
    setEditTarget(null);
    setDrawerTransactionType(nextType);
    setDrawerError("");
    setExpenseDraft(createEmptyExpenseDraft(defaultEntityId));
    setIncomeDraft(createEmptyIncomeDraft(defaultEntityId));
    setTransferDraft(createEmptyTransferDraft(accounts));
    setDebtDraft(createEmptyDebtDraft(defaultEntityId));
  }

  function openAddDrawer() {
    const nextType = activeType === "all" ? "expense" : (activeType as DrawerTransactionType);
    resetAddDrawerState(nextType);
    setIsAddDrawerOpen(true);
  }

  function handleDrawerTypeChange(nextType: DrawerTransactionType) {
    setDrawerTransactionType(nextType);
    setDrawerError("");
  }

  function closeAddDrawer() {
    if (isDrawerSubmitting) {
      return;
    }
    setIsAddDrawerOpen(false);
    setDrawerError("");
    setDrawerMode("create");
    setEditTarget(null);
  }

  function closeGenericEditDrawer() {
    if (isGenericEditSubmitting) {
      return;
    }
    setIsGenericEditDrawerOpen(false);
    setGenericEditTarget(null);
    setGenericEditError("");
  }

  function buildRowActionKey(transaction: TransactionListRow) {
    return `${transaction.source_type}:${String(transaction.id)}`;
  }

  function extractRecordId(value: string | number) {
    const text = String(value);
    return text.includes(":") ? text.split(":").pop() || text : text;
  }

  function canEditTransaction(transaction: TransactionListRow) {
    return new Set<EditableSourceType>([
      "debt",
      "expense",
      "legacy_expense",
      "legacy_income",
      "legacy_transaction",
      "transaction",
      "transfer",
    ]).has(transaction.source_type as EditableSourceType);
  }

  async function openEditTransaction(transaction: TransactionListRow) {
    const actionKey = `${buildRowActionKey(transaction)}:edit`;
    setActiveRowActionId(actionKey);
    setDrawerError("");
    setGenericEditError("");
    try {
      const rawId = extractRecordId(transaction.id);
      if (transaction.source_type === "debt") {
        const numericId = Number(rawId);
        const record = debtList.find((item) => item.id === numericId);
        if (!record) {
          throw new Error("Debt record not found.");
        }
        setDrawerMode("edit");
        setEditTarget({ kind: "debt", id: numericId });
        setDrawerTransactionType("debt");
        setDebtDraft({
          amount: String(record.amount ?? ""),
          debt_category_id:
            record.debt_category_id === null || record.debt_category_id === undefined
              ? ""
              : String(record.debt_category_id),
          entity_id: record.entity_id || "",
          loan_origin: record.loan_origin || "",
          name: record.name || "",
          notes: record.notes || "",
          spent_at: record.spent_at || "",
          statement_month: record.statement_month || "",
        });
        setDrawerError("");
        setIsAddDrawerOpen(true);
        return;
      }

      if (transaction.source_type === "expense" || transaction.source_type === "legacy_expense") {
        const numericId = Number(rawId);
        const record = expenseList.find((item) => item.id === numericId);
        if (!record) {
          throw new Error("Expense record not found.");
        }
        setDrawerMode("edit");
        setEditTarget({ kind: "expense", id: numericId });
        setDrawerTransactionType("expense");
        setExpenseDraft({
          amount: String(record.amount ?? ""),
          entity_id: record.entity_id || "",
          expense_category_id:
            record.expense_category_id === null || record.expense_category_id === undefined
              ? ""
              : String(record.expense_category_id),
          expense_expectation:
            record.expense_expectation === "expected" ? "expected" : "unexpected",
          from_account_id:
            record.from_account_id === null || record.from_account_id === undefined
              ? ""
              : String(record.from_account_id),
          name: record.name || "",
          notes: record.notes || "",
          spent_at: record.spent_at || "",
        });
        setDrawerError("");
        setIsAddDrawerOpen(true);
        return;
      }

      if (transaction.source_type === "legacy_income") {
        const numericId = Number(rawId);
        const record = incomeList.find((item) => item.id === numericId);
        if (!record) {
          throw new Error("Income record not found.");
        }
        setDrawerMode("edit");
        setEditTarget({ kind: "income", id: numericId });
        setDrawerTransactionType("income");
        setIncomeDraft({
          amount: String(record.amount ?? ""),
          entity_id: record.entity_id || "",
          income_category_id:
            record.income_category_id === null || record.income_category_id === undefined
              ? ""
              : String(record.income_category_id),
          received_date: String(record.received_date || "").slice(0, 10),
          source: record.source || "",
          to_account_id:
            record.to_account_id === null || record.to_account_id === undefined
              ? ""
              : String(record.to_account_id),
        });
        setDrawerError("");
        setIsAddDrawerOpen(true);
        return;
      }

      if (
        transaction.source_type === "transaction" ||
        transaction.source_type === "legacy_transaction"
      ) {
        setGenericEditTarget({ kind: "transaction", id: String(rawId) });
        setGenericTransactionDraft({
          amount: String(transaction.amount ?? ""),
          category: transaction.category || "",
          created_at: String(transaction.created_at || "").slice(0, 10),
          from_account_id:
            transaction.from_account_id === null || transaction.from_account_id === undefined
              ? ""
              : String(transaction.from_account_id),
          note: transaction.note || "",
          to_account_id:
            transaction.to_account_id === null || transaction.to_account_id === undefined
              ? ""
              : String(transaction.to_account_id),
          type:
            transaction.type === "income"
              ? "income"
              : transaction.type === "transfer"
                ? "transfer"
                : "expense",
        });
        setGenericEditError("");
        setIsGenericEditDrawerOpen(true);
        return;
      }

      if (transaction.source_type === "transfer") {
        const transferRows = await api.getTransfers(
          selectedEntityId !== ALL_ENTITIES_ID ? { entity_id: selectedEntityId } : {}
        );
        const record = (Array.isArray(transferRows) ? transferRows : []).find(
          (item: any) => String(item?.id || "") === String(rawId)
        );
        if (!record) {
          throw new Error("Transfer record not found.");
        }
        setGenericEditTarget({ kind: "transfer", id: String(rawId) });
        setTransferEditDraft({
          amount: String(record.amount ?? ""),
          date: String(record.date || record.created_at || "").slice(0, 10),
          expense_category_id:
            record.expense_category_id === null || record.expense_category_id === undefined
              ? ""
              : String(record.expense_category_id),
          from_account_id:
            record.from_account_id === null || record.from_account_id === undefined
              ? ""
              : String(record.from_account_id),
          income_category_id:
            record.income_category_id === null || record.income_category_id === undefined
              ? ""
              : String(record.income_category_id),
          mirror_as_income_expense: Boolean(record.mirror_as_income_expense),
          notes: record.notes || "",
          to_account_id:
            record.to_account_id === null || record.to_account_id === undefined
              ? ""
              : String(record.to_account_id),
          transfer_fee_amount: String(record.transfer_fee_amount ?? ""),
        });
        setGenericEditError("");
        setIsGenericEditDrawerOpen(true);
        return;
      }

      throw new Error("Edit is not supported for this transaction.");
    } catch (error: any) {
      const message = error?.message || "Failed to load transaction for editing.";
      if (
        transaction.source_type === "debt" ||
        transaction.source_type === "expense" ||
        transaction.source_type === "legacy_expense" ||
        transaction.source_type === "legacy_income"
      ) {
        setDrawerError(message);
      } else {
        setGenericEditError(message);
      }
    } finally {
      setActiveRowActionId("");
    }
  }

  async function handleDeleteTransaction(transaction: TransactionListRow) {
    const actionKey = `${buildRowActionKey(transaction)}:delete`;
    const confirmed = window.confirm("Delete this transaction?");
    if (!confirmed) {
      return;
    }
    setActiveRowActionId(actionKey);
    try {
      const rawId = extractRecordId(transaction.id);
      if (transaction.source_type === "debt") {
        await deleteDebt(Number(rawId));
        return;
      }
      if (transaction.source_type === "expense" || transaction.source_type === "legacy_expense") {
        await deleteExpense(Number(rawId));
        return;
      }
      if (transaction.source_type === "legacy_income") {
        await deleteIncome(Number(rawId));
        return;
      }
      if (transaction.source_type === "transfer") {
        await deleteTransfer(String(rawId), { source_type: "transfer" });
        return;
      }
      if (transaction.source_type === "legacy_transaction") {
        await deleteTransfer(String(rawId), { source_type: "legacy_transaction" });
        return;
      }
      if (transaction.source_type === "transaction") {
        await deleteTransaction(String(rawId));
        return;
      }
      throw new Error("Delete is not supported for this transaction.");
    } catch (error: any) {
      setDrawerError(error?.message || "Failed to delete transaction.");
    } finally {
      setActiveRowActionId("");
    }
  }

  const filtered = useMemo(() => {
    return sourceRows.filter((transaction) => {
      const text = `${transaction.note || ""} ${transaction.category || ""} ${transaction.from_account_name || ""} ${transaction.to_account_name || ""}`
        .toLowerCase()
        .trim();
      const matchesSearch = !search || text.includes(search.toLowerCase());
      const matchesType =
        activeType === "expense" || activeType === "debt"
          ? true
          : activeType === "all" || transaction.type === activeType;
      const categoryLabel = String(transaction.category || "Uncategorized");
      const matchesCategory =
        selectedCategorySet.size === 0 || selectedCategorySet.has(categoryLabel);
      const matchesMonth = !selectedMonth || monthKey(transaction.created_at) === selectedMonth;
      return matchesSearch && matchesType && matchesCategory && matchesMonth;
    });
  }, [activeType, search, selectedCategorySet, selectedMonth, sourceRows]);
  const visibleRows = useMemo(() => {
    const rows = [...filtered];

    rows.sort((left, right) => {
      if (sortOrder === "date_desc") {
        return String(right.created_at).localeCompare(String(left.created_at));
      }
      if (sortOrder === "date_asc") {
        return String(left.created_at).localeCompare(String(right.created_at));
      }
      if (sortOrder === "amount_desc") {
        return Number(right.amount || 0) - Number(left.amount || 0);
      }
      return Number(left.amount || 0) - Number(right.amount || 0);
    });

    return rows;
  }, [filtered, sortOrder]);
  const categoryFilterLabel =
    selectedCategories.length === 0
      ? "Filter: all categories"
      : selectedCategories.length === 1
        ? selectedCategories[0]
        : `${selectedCategories.length} categories selected`;
  const sortOptions: Array<{ label: string; value: SortOrder }> = [
    { label: "Date: most recent", value: "date_desc" },
    { label: "Date: oldest first", value: "date_asc" },
    { label: "Amount: highest first", value: "amount_desc" },
    { label: "Amount: lowest first", value: "amount_asc" },
  ];
  const groupOptions: Array<{ label: string; value: GroupBy }> = [
    { label: "Group: date", value: "date" },
    { label: "Group: category", value: "category" },
    { label: "Group: type", value: "type" },
  ];
  const sortOrderLabel =
    sortOptions.find((option) => option.value === sortOrder)?.label || "Order";
  const groupByLabel =
    groupOptions.find((option) => option.value === groupBy)?.label || "Group";
  const monthLabelText =
    selectedMonth && activeType === "debt"
      ? `${monthLabel(selectedMonth)} statement`
      : selectedMonth
        ? monthLabel(selectedMonth)
        : "All months";
  const expenseSummary = useMemo(() => {
    const normalizeExpectation = (value: unknown): ExpenseExpectation =>
      value === "expected" ? "expected" : "unexpected";

    return expenseList.reduce(
      (summary, expense) => {
        const matchesMonth = !selectedMonth || monthKey(expense.spent_at) === selectedMonth;
        if (!matchesMonth) {
          return summary;
        }
        const amount = Number(expense.amount || 0);
        const expectation = normalizeExpectation(expense.expense_expectation);
        summary.total += amount;
        summary[expectation] += amount;
        summary.count += 1;
        return summary;
      },
      { total: 0, expected: 0, unexpected: 0, count: 0 }
    );
  }, [expenseList, selectedMonth]);
  const incomeSummary = useMemo(() => {
    return sortedTransactions.reduce(
      (summary, transaction) => {
        if (transaction.type !== "income") {
          return summary;
        }
        const matchesMonth = !selectedMonth || monthKey(transaction.created_at) === selectedMonth;
        if (!matchesMonth) {
          return summary;
        }
        summary.total += Number(transaction.amount || 0);
        summary.count += 1;
        return summary;
      },
      { total: 0, count: 0 }
    );
  }, [selectedMonth, sortedTransactions]);
  const debtSummary = useMemo(() => {
    return debtList.reduce(
      (summary, debt) => {
        const matchesMonth = !selectedMonth || monthKey(debt.spent_at) === selectedMonth;
        if (!matchesMonth) {
          return summary;
        }
        summary.total += Number(debt.amount || 0);
        summary.count += 1;
        return summary;
      },
      { total: 0, count: 0 }
    );
  }, [debtList, selectedMonth]);
  const expenseComparison = useMemo(() => {
    if (!selectedMonth) {
      return null;
    }

    const cutoffDay = new Date().getDate();
    const previousMonth = getPreviousMonthKey(selectedMonth);
    const currentWindow = buildExpenseWindowSummary(expenseList, selectedMonth, cutoffDay);
    const previousWindow = buildExpenseWindowSummary(expenseList, previousMonth, cutoffDay);

    return {
      total: buildComparisonMeta(currentWindow.total, previousWindow.total),
      expected: buildComparisonMeta(currentWindow.expected, previousWindow.expected),
      unexpected: buildComparisonMeta(currentWindow.unexpected, previousWindow.unexpected),
    };
  }, [expenseList, selectedMonth]);
  const transferSummary = useMemo(() => {
    return sortedTransactions.reduce(
      (summary, transaction) => {
        if (transaction.type !== "transfer") {
          return summary;
        }
        const matchesMonth = !selectedMonth || monthKey(transaction.created_at) === selectedMonth;
        if (!matchesMonth) {
          return summary;
        }
        summary.total += Number(transaction.amount || 0);
        summary.count += 1;
        return summary;
      },
      { total: 0, count: 0 }
    );
  }, [selectedMonth, sortedTransactions]);
  const metricCards = (() => {
    if (activeType === "expense") {
      return [
        {
          label: "Total Expenses",
          value: formatCurrency(expenseSummary.total, currency),
          accent: "negative" as const,
          hint: undefined,
          comparison: expenseComparison?.total || null,
        },
        {
          label: "Expected",
          value: formatCurrency(expenseSummary.expected, currency),
          accent: "positive" as const,
          hint: undefined,
          comparison: expenseComparison?.expected || null,
        },
        {
          label: "Unexpected",
          value: formatCurrency(expenseSummary.unexpected, currency),
          accent: "warning" as const,
          hint: undefined,
          comparison: expenseComparison?.unexpected || null,
        },
      ];
    }

    if (activeType === "income") {
      return [
        {
          label: "Total Income",
          value: formatCurrency(incomeSummary.total, currency),
          accent: "positive" as const,
          hint: undefined,
          comparison: null,
        },
      ];
    }

    if (activeType === "transfer") {
      return [
        {
          label: "Total Transfers",
          value: formatCurrency(transferSummary.total, currency),
          accent: "default" as const,
          hint: `${transferSummary.count} transfer record${transferSummary.count === 1 ? "" : "s"}`,
          comparison: null,
        },
      ];
    }

    if (activeType === "debt") {
      return [
        {
          label: "Total Debt",
          value: formatCurrency(debtSummary.total, currency),
          accent: "default" as const,
          hint: undefined,
          comparison: null,
        },
      ];
    }

    return [
      {
        label: "Total Income",
        value: formatCurrency(incomeSummary.total, currency),
        accent: "positive" as const,
        hint: undefined,
        comparison: null,
      },
      {
        label: "Total Expenses",
        value: formatCurrency(expenseSummary.total, currency),
        accent: "negative" as const,
        hint: undefined,
        comparison: null,
      },
      {
        label: "Total Debt",
        value: formatCurrency(debtSummary.total, currency),
        accent: "default" as const,
        hint: undefined,
        comparison: null,
      },
    ];
  })();
  const groupedRows = useMemo(() => {
    const sections: Array<{ key: string; label: string; rows: TransactionListRow[] }> = [];
    const sectionMap = new Map<string, { key: string; label: string; rows: TransactionListRow[] }>();

    visibleRows.forEach((transaction) => {
      const section = getTransactionGroupSection(transaction, groupBy);
      if (!sectionMap.has(section.key)) {
        const entry = { ...section, rows: [] as TransactionListRow[] };
        sectionMap.set(section.key, entry);
        sections.push(entry);
      }
      sectionMap.get(section.key)?.rows.push(transaction);
    });

    return sections;
  }, [groupBy, visibleRows]);
  const selectedExpenseAccount = useMemo(
    () => accounts.find((account) => String(account.id) === expenseDraft.from_account_id) || null,
    [accounts, expenseDraft.from_account_id]
  );
  const selectedIncomeAccount = useMemo(
    () => accounts.find((account) => String(account.id) === incomeDraft.to_account_id) || null,
    [accounts, incomeDraft.to_account_id]
  );
  const selectedTransferFromAccount = useMemo(
    () => accounts.find((account) => String(account.id) === transferDraft.from_account_id) || null,
    [accounts, transferDraft.from_account_id]
  );
  const selectedTransferToAccount = useMemo(
    () => accounts.find((account) => String(account.id) === transferDraft.to_account_id) || null,
    [accounts, transferDraft.to_account_id]
  );
  const selectedEditTransferFromAccount = useMemo(
    () =>
      accounts.find((account) => String(account.id) === transferEditDraft.from_account_id) || null,
    [accounts, transferEditDraft.from_account_id]
  );
  const selectedEditTransferToAccount = useMemo(
    () =>
      accounts.find((account) => String(account.id) === transferEditDraft.to_account_id) || null,
    [accounts, transferEditDraft.to_account_id]
  );
  const transferTargetAccounts = useMemo(
    () =>
      accounts.filter((account) => String(account.id) !== transferDraft.from_account_id),
    [accounts, transferDraft.from_account_id]
  );
  const transferEditTargetAccounts = useMemo(
    () =>
      accounts.filter((account) => String(account.id) !== transferEditDraft.from_account_id),
    [accounts, transferEditDraft.from_account_id]
  );
  const isTransferCrossEntity =
    Boolean(selectedTransferFromAccount && selectedTransferToAccount) &&
    selectedTransferFromAccount?.entity_id !== selectedTransferToAccount?.entity_id;
  const isTransferCurrencyMismatch =
    Boolean(selectedTransferFromAccount && selectedTransferToAccount) &&
    String(selectedTransferFromAccount?.currency_code || "").trim().toUpperCase() !==
      String(selectedTransferToAccount?.currency_code || "").trim().toUpperCase();
  const isTransferEditCrossEntity =
    Boolean(selectedEditTransferFromAccount && selectedEditTransferToAccount) &&
    selectedEditTransferFromAccount?.entity_id !== selectedEditTransferToAccount?.entity_id;
  const isTransferEditCurrencyMismatch =
    Boolean(selectedEditTransferFromAccount && selectedEditTransferToAccount) &&
    String(selectedEditTransferFromAccount?.currency_code || "").trim().toUpperCase() !==
      String(selectedEditTransferToAccount?.currency_code || "").trim().toUpperCase();
  const getTransactionCategoryMeta = (transaction: TransactionListRow): CategoryMeta => {
    const label = String(transaction.category || "Uncategorized").trim() || "Uncategorized";
    const normalizedLabel = normalizeCategoryKey(label);
    const categoryRecord =
      transaction.type === "income"
        ? incomeCategoryMetaByName.get(normalizedLabel)
        : expenseCategoryMetaByName.get(normalizedLabel) ||
          incomeCategoryMetaByName.get(normalizedLabel);

    return {
      label,
      color: categoryRecord?.color || resolveCategoryColor(null, `transaction-category:${label}`),
      icon: categoryRecord?.icon || null,
    };
  };

  async function submitGenericEditDrawer() {
    if (!genericEditTarget) {
      return;
    }

    setIsGenericEditSubmitting(true);
    setGenericEditError("");

    try {
      if (genericEditTarget.kind === "transaction") {
        const amount = Number(genericTransactionDraft.amount || 0);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error("Enter a valid amount.");
        }
        if (!genericTransactionDraft.created_at) {
          throw new Error("Transaction date is required.");
        }
        if (
          genericTransactionDraft.type === "transfer" &&
          genericTransactionDraft.from_account_id === genericTransactionDraft.to_account_id
        ) {
          throw new Error("Transfer must use two different accounts.");
        }

        await updateTransaction(genericEditTarget.id, {
          amount,
          category: genericTransactionDraft.category.trim() || null,
          created_at: genericTransactionDraft.created_at,
          from_account_id: genericTransactionDraft.from_account_id
            ? Number(genericTransactionDraft.from_account_id)
            : null,
          note: genericTransactionDraft.note.trim() || null,
          to_account_id: genericTransactionDraft.to_account_id
            ? Number(genericTransactionDraft.to_account_id)
            : null,
          type: genericTransactionDraft.type,
        });
      } else {
        const fromAccountId = Number(transferEditDraft.from_account_id || 0);
        const toAccountId = Number(transferEditDraft.to_account_id || 0);
        const amount = Number(transferEditDraft.amount || 0);
        const transferFeeAmount = Number(transferEditDraft.transfer_fee_amount || 0);

        if (!Number.isInteger(fromAccountId) || fromAccountId <= 0) {
          throw new Error("Select a source account.");
        }
        if (!Number.isInteger(toAccountId) || toAccountId <= 0) {
          throw new Error("Select a destination account.");
        }
        if (fromAccountId === toAccountId) {
          throw new Error("Transfer must use two different accounts.");
        }
        if (isTransferEditCurrencyMismatch) {
          throw new Error("Transfer requires accounts with the same currency.");
        }
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error("Enter a valid transfer amount.");
        }
        if (!Number.isFinite(transferFeeAmount) || transferFeeAmount < 0) {
          throw new Error("Enter a valid transfer fee.");
        }
        if (!transferEditDraft.date) {
          throw new Error("Transfer date is required.");
        }

        await updateTransfer(genericEditTarget.id, {
          amount,
          date: transferEditDraft.date,
          expense_category_id:
            isTransferEditCrossEntity &&
            transferEditDraft.mirror_as_income_expense &&
            transferEditDraft.expense_category_id
              ? Number(transferEditDraft.expense_category_id)
              : null,
          from_account_id: fromAccountId,
          income_category_id:
            isTransferEditCrossEntity &&
            transferEditDraft.mirror_as_income_expense &&
            transferEditDraft.income_category_id
              ? Number(transferEditDraft.income_category_id)
              : null,
          mirror_as_income_expense:
            isTransferEditCrossEntity && Boolean(transferEditDraft.mirror_as_income_expense),
          notes: transferEditDraft.notes.trim() || null,
          to_account_id: toAccountId,
          transfer_fee_amount: transferFeeAmount,
        });
      }

      closeGenericEditDrawer();
    } catch (error: any) {
      setGenericEditError(error?.message || "Failed to update transaction.");
    } finally {
      setIsGenericEditSubmitting(false);
    }
  }

  async function submitAddDrawer() {
    setIsDrawerSubmitting(true);
    setDrawerError("");

    try {
      if (drawerTransactionType === "expense") {
        const entityId = resolveEntityIdForDraft(
          selectedEntityId,
          expenseDraft.entity_id,
          selectedExpenseAccount?.entity_id
        );
        if (!entityId) {
          throw new Error("Select an entity or account.");
        }
        const payload = {
          amount: Number(expenseDraft.amount || 0),
          category: expenseDraft.name,
          name: expenseDraft.name,
          notes: expenseDraft.notes.trim() || null,
          spent_at: expenseDraft.spent_at,
          expense_category_id: expenseDraft.expense_category_id
            ? Number(expenseDraft.expense_category_id)
            : null,
          expense_expectation: expenseDraft.expense_expectation,
          entity_id: entityId,
          from_account_id: expenseDraft.from_account_id
            ? Number(expenseDraft.from_account_id)
            : null,
        };
        if (drawerMode === "edit" && editTarget?.kind === "expense") {
          await updateExpense(editTarget.id, payload);
        } else {
          await createExpense(payload);
        }
      } else if (drawerTransactionType === "income") {
        const entityId = resolveEntityIdForDraft(
          selectedEntityId,
          incomeDraft.entity_id,
          selectedIncomeAccount?.entity_id
        );
        if (!entityId) {
          throw new Error("Select an entity or account.");
        }
        const payload = {
          amount: Number(incomeDraft.amount || 0),
          source: incomeDraft.source,
          received_date: incomeDraft.received_date,
          income_category_id: incomeDraft.income_category_id
            ? Number(incomeDraft.income_category_id)
            : null,
          entity_id: entityId,
          to_account_id: incomeDraft.to_account_id ? Number(incomeDraft.to_account_id) : null,
        };
        if (drawerMode === "edit" && editTarget?.kind === "income") {
          await updateIncome(editTarget.id, payload);
        } else {
          await createIncome(payload);
        }
      } else if (drawerTransactionType === "transfer") {
        const fromAccountId = Number(transferDraft.from_account_id || 0);
        const toAccountId = Number(transferDraft.to_account_id || 0);
        const amount = Number(transferDraft.amount || 0);
        const transferFeeAmount = Number(transferDraft.transfer_fee_amount || 0);
        if (!Number.isInteger(fromAccountId) || fromAccountId <= 0) {
          throw new Error("Select a source account.");
        }
        if (!Number.isInteger(toAccountId) || toAccountId <= 0) {
          throw new Error("Select a destination account.");
        }
        if (fromAccountId === toAccountId) {
          throw new Error("Transfer must use two different accounts.");
        }
        if (isTransferCurrencyMismatch) {
          throw new Error("Transfer requires accounts with the same currency.");
        }
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error("Enter a valid transfer amount.");
        }
        if (!Number.isFinite(transferFeeAmount) || transferFeeAmount < 0) {
          throw new Error("Enter a valid transfer fee.");
        }
        if (!transferDraft.date) {
          throw new Error("Transfer date is required.");
        }
        const payload = {
          from_account_id: fromAccountId,
          to_account_id: toAccountId,
          amount,
          transfer_fee_amount: transferFeeAmount,
          mirror_as_income_expense:
            isTransferCrossEntity && Boolean(transferDraft.mirror_as_income_expense),
          expense_category_id:
            isTransferCrossEntity &&
            transferDraft.mirror_as_income_expense &&
            transferDraft.expense_category_id
              ? Number(transferDraft.expense_category_id)
              : null,
          income_category_id:
            isTransferCrossEntity &&
            transferDraft.mirror_as_income_expense &&
            transferDraft.income_category_id
              ? Number(transferDraft.income_category_id)
              : null,
          date: transferDraft.date,
          notes: transferDraft.notes.trim() || null,
        };
        if (drawerMode === "edit" && editTarget?.kind === "transfer") {
          await updateTransfer(editTarget.id, payload);
        } else {
          await createTransfer(payload);
        }
      } else {
        const entityId = resolveEntityIdForDraft(
          selectedEntityId,
          debtDraft.entity_id,
          null
        );
        if (!entityId) {
          throw new Error("Select an entity.");
        }
        const payload = {
          amount: Number(debtDraft.amount || 0),
          name: debtDraft.name,
          loan_origin: debtDraft.loan_origin.trim() || null,
          notes: debtDraft.notes.trim() || null,
          spent_at: debtDraft.spent_at,
          debt_category_id: debtDraft.debt_category_id ? Number(debtDraft.debt_category_id) : null,
          statement_month: debtDraft.statement_month.trim() || null,
          entity_id: entityId,
        };
        if (drawerMode === "edit" && editTarget?.kind === "debt") {
          await updateDebt(editTarget.id, payload);
        } else {
          await createDebt(payload);
        }
      }

      setIsAddDrawerOpen(false);
      setDrawerError("");
      setDrawerMode("create");
      setEditTarget(null);
    } catch (error: any) {
      setDrawerError(error?.message || "Failed to add transaction");
    } finally {
      setIsDrawerSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <main className="px-4 pb-12 pt-20 md:px-8">
          <LoadingState label="Loading transactions..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="px-4 pb-12 pt-20 md:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-text">Transactions</h1>
          <button
            type="button"
            onClick={openAddDrawer}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-dark"
          >
            <i className="ri-add-line text-base" />
            <span>{activeType === "all" ? "Add Transaction" : `Add ${activeType}`}</span>
          </button>
        </div>

	        {activeType === "debt" ? null : (
	          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
	            {metricCards.map((card) => (
	              <MetricCard
	                key={card.label}
	                label={card.label}
	                value={card.value}
	                accent={card.accent}
	                comparison={card.comparison}
	                hint={card.hint}
	              />
	            ))}
	          </div>
	        )}

        <div
          ref={filterAnchorRef}
          className={isFilterDocked ? "mb-[10.5rem] md:mb-[8.5rem]" : "mb-4"}
        >
          <div
            className={`${
              isFilterDocked
                ? "fixed inset-x-0 top-0 z-[40] bg-bg/95 py-2 backdrop-blur"
                : "sticky top-0 z-[40] -mx-4 bg-bg/95 px-4 py-2 backdrop-blur md:-mx-8 md:px-8"
            }`}
          >
          <Card className={`${isFilterDocked ? "rounded-none border-x-0 shadow-lg" : "shadow-md"} p-4`}>
            <div className="grid gap-3 lg:grid-cols-[1.3fr,0.7fr,0.8fr]">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by note, category, or account"
                  className="w-full rounded-lg border border-transparent bg-bg-subtle py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-accent"
                />
              </div>
              <div className="relative" ref={monthMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMonthMenuOpen((open) => !open)}
                  className="flex w-full items-center justify-between rounded-lg bg-bg-subtle px-3 py-2.5 text-left text-sm text-text outline-none transition hover:bg-bg"
                >
                  <span className="truncate">{monthLabelText}</span>
                  <i
                    className={`ri-arrow-down-s-line text-base text-text-secondary transition-transform ${
                      isMonthMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isMonthMenuOpen ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMonth("");
                          setIsMonthMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                          selectedMonth === ""
                            ? "bg-accent text-white"
                            : "text-text-secondary hover:bg-bg-subtle hover:text-text"
                        }`}
                      >
                        <span>All months</span>
                        {selectedMonth === "" ? <i className="ri-check-line text-base" /> : null}
                      </button>
                      {(activeType === "debt" ? debtCycleMonths : monthOptions).map((value) => {
                        const active = selectedMonth === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              setSelectedMonth(value);
                              setIsMonthMenuOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                              active
                                ? "bg-accent text-white"
                                : "text-text-secondary hover:bg-bg-subtle hover:text-text"
                            }`}
                          >
                            <span>{monthLabel(value)}</span>
                            {active ? <i className="ri-check-line text-base" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-bg-subtle p-1">
                {(["all", "expense", "income", "transfer", "debt"] as FilterType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveType(type)}
                    className={`flex-1 rounded-md px-3 py-2 text-xs font-medium capitalize transition-colors ${
                      activeType === type ? "bg-white text-text shadow-sm" : "text-text-secondary"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

	            <div className={`mt-3 grid gap-3 ${activeType === "debt" ? "md:grid-cols-[1.1fr,0.9fr]" : "md:grid-cols-3"}`}>
	              <div className="relative" ref={categoryMenuRef}>
	                <button
	                  type="button"
	                  onClick={() => setIsCategoryMenuOpen((open) => !open)}
	                  className="flex w-full items-center justify-between rounded-lg bg-bg-subtle px-3 py-2.5 text-left text-sm text-text outline-none transition hover:bg-bg"
	                >
	                  <span className="truncate">{categoryFilterLabel}</span>
	                  <i
	                    className={`ri-arrow-down-s-line text-base text-text-secondary transition-transform ${
	                      isCategoryMenuOpen ? "rotate-180" : ""
	                    }`}
	                  />
	                </button>
	                {isCategoryMenuOpen ? (
	                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
	                    <div className="mb-3 flex items-center justify-between gap-3">
	                      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
	                        Categories
	                      </p>
	                      <button
	                        type="button"
	                        onClick={() => setSelectedCategories([])}
	                        className="text-xs font-medium text-accent transition hover:text-accent-dark"
	                      >
	                        Clear all
	                      </button>
	                    </div>
	                    <div className="flex flex-wrap gap-2">
	                      {categoryFilters.map((category) => {
	                        const active = selectedCategorySet.has(category);
	                        return (
	                          <button
	                            key={category}
	                            type="button"
	                            onClick={() =>
	                              setSelectedCategories((current) =>
	                                current.includes(category)
	                                  ? current.filter((item) => item !== category)
	                                  : [...current, category]
	                              )
	                            }
	                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
	                              active
	                                ? "border-accent bg-accent text-white"
	                                : "border-slate-200 bg-white text-text-secondary hover:border-slate-300 hover:text-text"
	                            }`}
	                          >
	                            {category}
	                          </button>
	                        );
	                      })}
	                    </div>
	                  </div>
	                ) : null}
	              </div>
	              {activeType === "debt" ? (
	                <div className="rounded-lg bg-bg-subtle px-4 py-3">
	                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
	                    Statement-aware debt mode
	                  </p>
	                  <p className="mt-1 text-sm text-text-secondary">
	                    Statement months follow the loan origin rules from Settings → Debts, so late-March charges can appear in the April statement.
	                  </p>
	                </div>
	              ) : (
	                <>
	                  <div className="relative" ref={sortMenuRef}>
	                    <button
	                      type="button"
	                      onClick={() => setIsSortMenuOpen((open) => !open)}
	                      className="flex w-full items-center justify-between rounded-lg bg-bg-subtle px-3 py-2.5 text-left text-sm text-text outline-none transition hover:bg-bg"
	                    >
	                      <span className="truncate">{sortOrderLabel}</span>
	                      <i
	                        className={`ri-arrow-down-s-line text-base text-text-secondary transition-transform ${
	                          isSortMenuOpen ? "rotate-180" : ""
	                        }`}
	                      />
	                    </button>
	                    {isSortMenuOpen ? (
	                      <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
	                        <div className="space-y-1">
	                          {sortOptions.map((option) => {
	                            const active = sortOrder === option.value;
	                            return (
	                              <button
	                                key={option.value}
	                                type="button"
	                                onClick={() => {
	                                  setSortOrder(option.value);
	                                  setIsSortMenuOpen(false);
	                                }}
	                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
	                                  active
	                                    ? "bg-accent text-white"
	                                    : "text-text-secondary hover:bg-bg-subtle hover:text-text"
	                                }`}
	                              >
	                                <span>{option.label}</span>
	                                {active ? <i className="ri-check-line text-base" /> : null}
	                              </button>
	                            );
	                          })}
	                        </div>
	                      </div>
	                    ) : null}
	                  </div>
	                  <div className="relative" ref={groupMenuRef}>
	                    <button
	                      type="button"
	                      onClick={() => setIsGroupMenuOpen((open) => !open)}
	                      className="flex w-full items-center justify-between rounded-lg bg-bg-subtle px-3 py-2.5 text-left text-sm text-text outline-none transition hover:bg-bg"
	                    >
	                      <span className="truncate">{groupByLabel}</span>
	                      <i
	                        className={`ri-arrow-down-s-line text-base text-text-secondary transition-transform ${
	                          isGroupMenuOpen ? "rotate-180" : ""
	                        }`}
	                      />
	                    </button>
	                    {isGroupMenuOpen ? (
	                      <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
	                        <div className="space-y-1">
	                          {groupOptions.map((option) => {
	                            const active = groupBy === option.value;
	                            return (
	                              <button
	                                key={option.value}
	                                type="button"
	                                onClick={() => {
	                                  setGroupBy(option.value);
	                                  setIsGroupMenuOpen(false);
	                                }}
	                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
	                                  active
	                                    ? "bg-accent text-white"
	                                    : "text-text-secondary hover:bg-bg-subtle hover:text-text"
	                                }`}
	                              >
	                                <span>{option.label}</span>
	                                {active ? <i className="ri-check-line text-base" /> : null}
	                              </button>
	                            );
	                          })}
	                        </div>
	                      </div>
	                    ) : null}
	                  </div>
	                </>
	              )}
	            </div>
	          </Card>
	          </div>
	        </div>

	        {activeType === "debt" ? (
	          <DebtStatementsView
	            accounts={accounts}
	            activeRowActionId={activeRowActionId}
	            currency={currency}
	            debtList={debtList}
	            loanOriginConfigs={loanOriginConfigs}
	            onDeleteDebtRow={(row) => {
	              void handleDeleteTransaction(createDebtTransactionRow(row, currency));
	            }}
	            onEditDebtRow={(row) => {
	              void openEditTransaction(createDebtTransactionRow(row, currency));
	            }}
	            search={search}
	            selectedCategories={selectedCategories}
	            selectedMonth={selectedMonth}
	            settings={settings}
	            onPayoffDebtByOrigin={payoffDebtByOrigin}
	          />
	        ) : visibleRows.length === 0 ? (
	          <EmptyState title="No matching transactions" body="Adjust the filters or search to see more records." />
	        ) : (
          <div className="space-y-4">
            {groupedRows.map((section) => (
              <section key={section.key}>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <h2 className="text-sm font-semibold text-text">{section.label}</h2>
                  <span className="text-2xs text-text-secondary">{section.rows.length}</span>
                </div>
                <div className="space-y-2">
                  {section.rows.map((transaction) => {
                    const rowId = `${transaction.source_type}:${transaction.id}`;
                    return (
                      <TransactionRowCard
                        key={rowId}
                        currency={currency}
                        expanded={expandedId === rowId}
                        categoryMeta={getTransactionCategoryMeta(transaction)}
                        canEdit={canEditTransaction(transaction)}
                        isBusy={activeRowActionId.startsWith(`${rowId}:`)}
                        onDelete={() => handleDeleteTransaction(transaction)}
                        onEdit={() => openEditTransaction(transaction)}
                        onToggle={() => setExpandedId(expandedId === rowId ? "" : rowId)}
                        transaction={transaction}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <TransactionCreateDrawer
        accounts={accounts}
        categories={categories}
        debtDraft={debtDraft}
        defaultEntityId={defaultEntityId}
        drawerError={drawerError}
        drawerMode={drawerMode}
        drawerTransactionType={drawerTransactionType}
        entities={entities}
        expenseDraft={expenseDraft}
        incomeCategories={incomeCategories}
        incomeDraft={incomeDraft}
        isAllEntities={selectedEntityId === ALL_ENTITIES_ID}
        isOpen={isAddDrawerOpen}
        isSubmitting={isDrawerSubmitting}
        isTransferCrossEntity={isTransferCrossEntity}
        onClose={closeAddDrawer}
        onDebtDraftChange={setDebtDraft}
        onExpenseDraftChange={setExpenseDraft}
        onIncomeDraftChange={setIncomeDraft}
        loanOriginOptions={loanOriginOptions}
        onSubmit={submitAddDrawer}
        onTransferDraftChange={setTransferDraft}
        onTypeChange={handleDrawerTypeChange}
        activeType={activeType}
        transferDraft={transferDraft}
        transferTargetAccounts={transferTargetAccounts}
      />
      <GenericEditDrawer
        accounts={accounts}
        categories={categories}
        error={genericEditError}
        incomeCategories={incomeCategories}
        isOpen={isGenericEditDrawerOpen}
        isSubmitting={isGenericEditSubmitting}
        isTransferCrossEntity={isTransferEditCrossEntity}
        onClose={closeGenericEditDrawer}
        onGenericTransactionDraftChange={setGenericTransactionDraft}
        onSubmit={submitGenericEditDrawer}
        onTransferDraftChange={setTransferEditDraft}
        target={genericEditTarget}
        transactionDraft={genericTransactionDraft}
        transferDraft={transferEditDraft}
        transferTargetAccounts={transferEditTargetAccounts}
      />
    </div>
  );
}

function TransactionRowCard({
  canEdit,
  categoryMeta,
  currency,
  expanded,
  isBusy,
  onDelete,
  onEdit,
  onToggle,
  transaction,
}: {
  canEdit: boolean;
  categoryMeta: CategoryMeta;
  currency: string;
  expanded: boolean;
  isBusy: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onToggle: () => void;
  transaction: TransactionListRow;
}) {
  const categoryIconStyle = buildCategoryBadgeStyle(categoryMeta.color);
  const usesTransferIcon = transaction.type === "transfer";

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-bg-subtle"
      >
        {usesTransferIcon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-subtle">
            <i className="ri-repeat-line text-accent" />
          </div>
        ) : (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
            style={categoryIconStyle}
          >
            {categoryMeta.icon ? (
              <i className={`${categoryMeta.icon} text-lg`} />
            ) : (
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "currentColor" }}
              />
            )}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-text">
              {transaction.note || transaction.category || "Transaction"}
            </p>
            <Badge
              variant={
                transaction.type === "income"
                  ? "positive"
                  : transaction.type === "transfer"
                    ? "accent"
                    : transaction.type === "debt"
                      ? "negative"
                      : "warning"
              }
              size="sm"
            >
              {transaction.type}
            </Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-2xs text-text-secondary">
            <span>{formatShortDate(transaction.created_at)}</span>
            <span>•</span>
            <span className="truncate">{categoryMeta.label}</span>
            <span>•</span>
            <span>{transaction.from_account_name || transaction.to_account_name || "Manual"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold ${
              transaction.type === "income"
                ? "text-positive"
                : transaction.type === "transfer"
                  ? "text-accent"
                  : transaction.type === "debt"
                    ? "text-negative"
                    : "text-text"
            }`}
          >
            {transaction.type === "income" ? "+" : transaction.type === "debt" ? "-" : ""}
            {formatCurrency(transaction.amount, transaction.currency_code || currency)}
          </span>
          <i
            className={`ri-arrow-down-s-line text-text-muted transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-bg-subtle px-4 pb-4 pt-3">
          <div className="mb-3 flex items-center justify-end gap-2">
            {canEdit ? (
              <button
                type="button"
                onClick={onEdit}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-bg-subtle px-3 py-2 text-sm font-medium text-text transition hover:bg-bg disabled:cursor-not-allowed disabled:opacity-60"
              >
                <i className="ri-pencil-line text-base" />
                <span>Edit</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={onDelete}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-negative-light px-3 py-2 text-sm font-medium text-negative-dark transition hover:bg-negative/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="ri-delete-bin-line text-base" />
              <span>Delete</span>
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InfoBlock label="Recorded">
              {formatLongDate(transaction.created_at)}
            </InfoBlock>
            <InfoBlock label="Source Type">{transaction.source_type}</InfoBlock>
            <InfoBlock label="From">
              {transaction.from_account_name || transaction.from_entity_name || "N/A"}
            </InfoBlock>
            <InfoBlock label="To">
              {transaction.to_account_name || transaction.to_entity_name || "N/A"}
            </InfoBlock>
            <InfoBlock label="Category">
              <span className="inline-flex items-center gap-2">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                  style={categoryIconStyle}
                >
                  {categoryMeta.icon ? (
                    <i className={`${categoryMeta.icon} text-xs`} />
                  ) : (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: "currentColor" }}
                    />
                  )}
                </span>
                <span>{categoryMeta.label}</span>
              </span>
            </InfoBlock>
            <InfoBlock label="Currency">{transaction.currency_code || currency}</InfoBlock>
          </div>
          {transaction.note ? (
            <div className="mt-3">
              <p className="text-2xs font-medium uppercase tracking-wide text-text-secondary">
                Note
              </p>
              <p className="mt-1 text-sm text-text">{transaction.note}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function TransactionCreateDrawer({
  accounts,
  activeType,
  categories,
  debtDraft,
  defaultEntityId,
  drawerError,
  drawerMode,
  drawerTransactionType,
  entities,
  expenseDraft,
  incomeCategories,
  incomeDraft,
  isAllEntities,
  isOpen,
  isSubmitting,
  isTransferCrossEntity,
  loanOriginOptions,
  onClose,
  onDebtDraftChange,
  onExpenseDraftChange,
  onIncomeDraftChange,
  onSubmit,
  onTransferDraftChange,
  onTypeChange,
  transferDraft,
  transferTargetAccounts,
}: {
  accounts: Array<{ id: number; name: string; entity_id: string; entity_name: string; currency_code: string }>;
  activeType: FilterType;
  categories: CategoryRecord[];
  debtDraft: DebtDraft;
  defaultEntityId: string;
  drawerError: string;
  drawerMode: DrawerMode;
  drawerTransactionType: DrawerTransactionType;
  entities: Array<{ id: string; name: string }>;
  expenseDraft: ExpenseDraft;
  incomeCategories: CategoryRecord[];
  incomeDraft: IncomeDraft;
  isAllEntities: boolean;
  isOpen: boolean;
  isSubmitting: boolean;
  isTransferCrossEntity: boolean;
  loanOriginOptions: string[];
  onClose: () => void;
  onDebtDraftChange: (value: DebtDraft | ((current: DebtDraft) => DebtDraft)) => void;
  onExpenseDraftChange: (value: ExpenseDraft | ((current: ExpenseDraft) => ExpenseDraft)) => void;
  onIncomeDraftChange: (value: IncomeDraft | ((current: IncomeDraft) => IncomeDraft)) => void;
  onSubmit: () => Promise<void>;
  onTransferDraftChange: (value: TransferDraft | ((current: TransferDraft) => TransferDraft)) => void;
  onTypeChange: (value: DrawerTransactionType) => void;
  transferDraft: TransferDraft;
  transferTargetAccounts: Array<{ id: number; name: string; entity_id: string; entity_name: string; currency_code: string }>;
}) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timeoutId = window.setTimeout(() => {
        setIsVisible(true);
      }, 16);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    setIsVisible(false);
    const timeoutId = window.setTimeout(() => {
      setShouldRender(false);
    }, 240);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen]);

  if (!shouldRender) {
    return null;
  }

  const title =
    drawerMode === "edit"
      ? drawerTransactionType === "expense"
        ? "Edit Expense"
        : drawerTransactionType === "income"
          ? "Edit Income"
          : drawerTransactionType === "transfer"
            ? "Edit Transfer"
            : "Edit Debt"
      : activeType === "all"
        ? "Add Transaction"
        : drawerTransactionType === "expense"
          ? "Add Expense"
          : drawerTransactionType === "income"
            ? "Add Income"
            : drawerTransactionType === "transfer"
              ? "Add Transfer"
              : "Add Debt";
  const submitLabel = drawerMode === "edit" ? "Save Changes" : title;

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-slate-950/30"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: "opacity 200ms ease",
      }}
      onClick={onClose}
    >
      <aside
        className="h-screen w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        style={{
          transform: isVisible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform",
        }}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
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

        {activeType === "all" && drawerMode === "create" ? (
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium text-text">Transaction Type</span>
            <select
              value={drawerTransactionType}
              onChange={(event) => onTypeChange(event.target.value as DrawerTransactionType)}
              className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm text-text outline-none"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
              <option value="debt">Debt</option>
            </select>
          </label>
        ) : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
          className="space-y-4"
        >
          {drawerTransactionType === "expense" ? (
            <>
              <FormInput
                label="Amount"
                inputMode="decimal"
                required
                value={expenseDraft.amount}
                onChange={(value) =>
                  onExpenseDraftChange((current) => ({ ...current, amount: value }))
                }
              />
              <FormInput
                label="Name"
                required
                value={expenseDraft.name}
                onChange={(value) =>
                  onExpenseDraftChange((current) => ({ ...current, name: value }))
                }
              />
              {isAllEntities ? (
                <FormSelect
                  label="Entity"
                  value={expenseDraft.entity_id || defaultEntityId}
                  onChange={(value) =>
                    onExpenseDraftChange((current) => ({ ...current, entity_id: value }))
                  }
                  options={entities.map((entity) => ({ label: entity.name, value: entity.id }))}
                />
              ) : null}
              <FormSelect
                label="Account"
                value={expenseDraft.from_account_id}
                onChange={(value) =>
                  onExpenseDraftChange((current) => ({ ...current, from_account_id: value }))
                }
                options={[
                  { label: "Use default account", value: "" },
                  ...accounts.map((account) => ({
                    label: formatAccountOptionLabel(account),
                    value: String(account.id),
                  })),
                ]}
              />
              <FormSelect
                label="Category"
                value={expenseDraft.expense_category_id}
                onChange={(value) =>
                  onExpenseDraftChange((current) => ({ ...current, expense_category_id: value }))
                }
                options={[
                  { label: "Uncategorized", value: "" },
                  ...categories.map((category) => ({
                    label: category.name,
                    value: String(category.id),
                  })),
                ]}
              />
              <FormSelect
                label="Expectation"
                value={expenseDraft.expense_expectation}
                onChange={(value) =>
                  onExpenseDraftChange((current) => ({
                    ...current,
                    expense_expectation: value as ExpenseExpectation,
                  }))
                }
                options={[
                  { label: "Expected", value: "expected" },
                  { label: "Unexpected", value: "unexpected" },
                ]}
              />
              <FormInput
                label="Date"
                required
                type="date"
                value={expenseDraft.spent_at}
                onChange={(value) =>
                  onExpenseDraftChange((current) => ({ ...current, spent_at: value }))
                }
              />
              <FormTextarea
                label="Notes"
                value={expenseDraft.notes}
                onChange={(value) =>
                  onExpenseDraftChange((current) => ({ ...current, notes: value }))
                }
              />
            </>
          ) : null}

          {drawerTransactionType === "income" ? (
            <>
              <FormInput
                label="Amount"
                inputMode="decimal"
                required
                value={incomeDraft.amount}
                onChange={(value) =>
                  onIncomeDraftChange((current) => ({ ...current, amount: value }))
                }
              />
              <FormInput
                label="Source"
                required
                value={incomeDraft.source}
                onChange={(value) =>
                  onIncomeDraftChange((current) => ({ ...current, source: value }))
                }
              />
              {isAllEntities ? (
                <FormSelect
                  label="Entity"
                  value={incomeDraft.entity_id || defaultEntityId}
                  onChange={(value) =>
                    onIncomeDraftChange((current) => ({ ...current, entity_id: value }))
                  }
                  options={entities.map((entity) => ({ label: entity.name, value: entity.id }))}
                />
              ) : null}
              <FormSelect
                label="Account"
                value={incomeDraft.to_account_id}
                onChange={(value) =>
                  onIncomeDraftChange((current) => ({ ...current, to_account_id: value }))
                }
                options={[
                  { label: "Use default account", value: "" },
                  ...accounts.map((account) => ({
                    label: formatAccountOptionLabel(account),
                    value: String(account.id),
                  })),
                ]}
              />
              <FormSelect
                label="Category"
                value={incomeDraft.income_category_id}
                onChange={(value) =>
                  onIncomeDraftChange((current) => ({ ...current, income_category_id: value }))
                }
                options={[
                  { label: "Uncategorized", value: "" },
                  ...incomeCategories.map((category) => ({
                    label: category.name,
                    value: String(category.id),
                  })),
                ]}
              />
              <FormInput
                label="Date"
                required
                type="date"
                value={incomeDraft.received_date}
                onChange={(value) =>
                  onIncomeDraftChange((current) => ({ ...current, received_date: value }))
                }
              />
            </>
          ) : null}

          {drawerTransactionType === "transfer" ? (
            <>
              <FormSelect
                label="From Account"
                value={transferDraft.from_account_id}
                onChange={(value) =>
                  onTransferDraftChange((current) => ({ ...current, from_account_id: value }))
                }
                options={[
                  { label: "Select account", value: "" },
                  ...accounts.map((account) => ({
                    label: formatAccountOptionLabel(account),
                    value: String(account.id),
                  })),
                ]}
              />
              <FormSelect
                label="To Account"
                value={transferDraft.to_account_id}
                onChange={(value) =>
                  onTransferDraftChange((current) => ({ ...current, to_account_id: value }))
                }
                options={[
                  { label: "Select account", value: "" },
                  ...transferTargetAccounts.map((account) => ({
                    label: formatAccountOptionLabel(account),
                    value: String(account.id),
                  })),
                ]}
              />
              <FormInput
                label="Amount"
                inputMode="decimal"
                required
                value={transferDraft.amount}
                onChange={(value) =>
                  onTransferDraftChange((current) => ({ ...current, amount: value }))
                }
              />
              <FormInput
                label="Transfer Fee"
                inputMode="decimal"
                value={transferDraft.transfer_fee_amount}
                onChange={(value) =>
                  onTransferDraftChange((current) => ({ ...current, transfer_fee_amount: value }))
                }
              />
              <FormInput
                label="Date"
                required
                type="date"
                value={transferDraft.date}
                onChange={(value) =>
                  onTransferDraftChange((current) => ({ ...current, date: value }))
                }
              />
              <FormTextarea
                label="Notes"
                value={transferDraft.notes}
                onChange={(value) =>
                  onTransferDraftChange((current) => ({ ...current, notes: value }))
                }
              />
              {isTransferCrossEntity ? (
                <>
                  <label className="flex items-center gap-2 rounded-lg bg-bg-subtle px-3 py-2.5 text-sm text-text">
                    <input
                      type="checkbox"
                      checked={transferDraft.mirror_as_income_expense}
                      onChange={(event) =>
                        onTransferDraftChange((current) => ({
                          ...current,
                          mirror_as_income_expense: event.target.checked,
                        }))
                      }
                    />
                    <span>Also record as expense and income</span>
                  </label>
                  {transferDraft.mirror_as_income_expense ? (
                    <>
                      <FormSelect
                        label="Source Expense Category"
                        value={transferDraft.expense_category_id}
                        onChange={(value) =>
                          onTransferDraftChange((current) => ({
                            ...current,
                            expense_category_id: value,
                          }))
                        }
                        options={[
                          { label: "Uncategorized", value: "" },
                          ...categories.map((category) => ({
                            label: category.name,
                            value: String(category.id),
                          })),
                        ]}
                      />
                      <FormSelect
                        label="Destination Income Category"
                        value={transferDraft.income_category_id}
                        onChange={(value) =>
                          onTransferDraftChange((current) => ({
                            ...current,
                            income_category_id: value,
                          }))
                        }
                        options={[
                          { label: "Uncategorized", value: "" },
                          ...incomeCategories.map((category) => ({
                            label: category.name,
                            value: String(category.id),
                          })),
                        ]}
                      />
                    </>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}

          {drawerTransactionType === "debt" ? (
            <>
              <FormInput
                label="Amount"
                inputMode="decimal"
                required
                value={debtDraft.amount}
                onChange={(value) =>
                  onDebtDraftChange((current) => ({ ...current, amount: value }))
                }
              />
              <FormInput
                label="Name"
                required
                value={debtDraft.name}
                onChange={(value) =>
                  onDebtDraftChange((current) => ({ ...current, name: value }))
                }
              />
              {isAllEntities ? (
                <FormSelect
                  label="Entity"
                  value={debtDraft.entity_id || defaultEntityId}
                  onChange={(value) =>
                    onDebtDraftChange((current) => ({ ...current, entity_id: value }))
                  }
                  options={entities.map((entity) => ({ label: entity.name, value: entity.id }))}
                />
              ) : null}
              <FormInput
                label="Loan Origin"
                value={debtDraft.loan_origin}
                onChange={(value) =>
                  onDebtDraftChange((current) => ({ ...current, loan_origin: value }))
                }
                list="transaction-debt-origin-options"
              />
              {loanOriginOptions.length > 0 ? (
                <datalist id="transaction-debt-origin-options">
                  {loanOriginOptions.map((origin) => (
                    <option key={origin} value={origin} />
                  ))}
                </datalist>
              ) : null}
              <FormSelect
                label="Category"
                value={debtDraft.debt_category_id}
                onChange={(value) =>
                  onDebtDraftChange((current) => ({ ...current, debt_category_id: value }))
                }
                options={[
                  { label: "Uncategorized", value: "" },
                  ...categories.map((category) => ({
                    label: category.name,
                    value: String(category.id),
                  })),
                ]}
              />
              <FormInput
                label="Date"
                required
                type="date"
                value={debtDraft.spent_at}
                onChange={(value) =>
                  onDebtDraftChange((current) => ({ ...current, spent_at: value }))
                }
              />
              <FormInput
                label="Statement Month"
                placeholder="YYYY-MM"
                value={debtDraft.statement_month}
                onChange={(value) =>
                  onDebtDraftChange((current) => ({ ...current, statement_month: value }))
                }
              />
              <FormTextarea
                label="Notes"
                value={debtDraft.notes}
                onChange={(value) =>
                  onDebtDraftChange((current) => ({ ...current, notes: value }))
                }
              />
            </>
          ) : null}

          {drawerError ? <p className="text-sm text-negative">{drawerError}</p> : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-dark disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function GenericEditDrawer({
  accounts,
  categories,
  error,
  incomeCategories,
  isOpen,
  isSubmitting,
  isTransferCrossEntity,
  onClose,
  onGenericTransactionDraftChange,
  onSubmit,
  onTransferDraftChange,
  target,
  transactionDraft,
  transferDraft,
  transferTargetAccounts,
}: {
  accounts: Array<{ id: number; name: string; entity_id: string; entity_name: string; currency_code: string }>;
  categories: CategoryRecord[];
  error: string;
  incomeCategories: CategoryRecord[];
  isOpen: boolean;
  isSubmitting: boolean;
  isTransferCrossEntity: boolean;
  onClose: () => void;
  onGenericTransactionDraftChange: (
    value:
      | GenericTransactionDraft
      | ((current: GenericTransactionDraft) => GenericTransactionDraft)
  ) => void;
  onSubmit: () => Promise<void>;
  onTransferDraftChange: (value: TransferDraft | ((current: TransferDraft) => TransferDraft)) => void;
  target: EditTarget | null;
  transactionDraft: GenericTransactionDraft;
  transferDraft: TransferDraft;
  transferTargetAccounts: Array<{ id: number; name: string; entity_id: string; entity_name: string; currency_code: string }>;
}) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timeoutId = window.setTimeout(() => {
        setIsVisible(true);
      }, 16);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    setIsVisible(false);
    const timeoutId = window.setTimeout(() => {
      setShouldRender(false);
    }, 240);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen]);

  if (!shouldRender || !target) {
    return null;
  }

  const title = target.kind === "transfer" ? "Edit Transfer" : "Edit Transaction";

  return (
    <div
      className="fixed inset-0 z-[85] flex justify-end bg-slate-950/30"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: "opacity 200ms ease",
      }}
      onClick={onClose}
    >
      <aside
        className="h-screen w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        style={{
          transform: isVisible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform",
        }}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
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
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
          className="space-y-4"
        >
          {target.kind === "transaction" ? (
            <>
              <FormSelect
                label="Type"
                value={transactionDraft.type}
                onChange={(value) =>
                  onGenericTransactionDraftChange((current) => ({
                    ...current,
                    type: value as GenericTransactionDraft["type"],
                    from_account_id: value === "income" ? "" : current.from_account_id,
                    to_account_id: value === "expense" ? "" : current.to_account_id,
                  }))
                }
                options={[
                  { label: "Expense", value: "expense" },
                  { label: "Income", value: "income" },
                  { label: "Transfer", value: "transfer" },
                ]}
              />
              <FormInput
                label="Amount"
                inputMode="decimal"
                required
                value={transactionDraft.amount}
                onChange={(value) =>
                  onGenericTransactionDraftChange((current) => ({
                    ...current,
                    amount: value,
                  }))
                }
              />
              <FormInput
                label="Category"
                value={transactionDraft.category}
                onChange={(value) =>
                  onGenericTransactionDraftChange((current) => ({
                    ...current,
                    category: value,
                  }))
                }
              />
              <FormInput
                label="Date"
                required
                type="date"
                value={transactionDraft.created_at}
                onChange={(value) =>
                  onGenericTransactionDraftChange((current) => ({
                    ...current,
                    created_at: value,
                  }))
                }
              />
              {transactionDraft.type === "expense" || transactionDraft.type === "transfer" ? (
                <FormSelect
                  label="From Account"
                  value={transactionDraft.from_account_id}
                  onChange={(value) =>
                    onGenericTransactionDraftChange((current) => ({
                      ...current,
                      from_account_id: value,
                    }))
                  }
                  options={[
                    {
                      label:
                        transactionDraft.type === "expense"
                          ? "Use default account"
                          : "Select account",
                      value: "",
                    },
                    ...accounts.map((account) => ({
                      label: formatAccountOptionLabel(account),
                      value: String(account.id),
                    })),
                  ]}
                />
              ) : null}
              {transactionDraft.type === "income" || transactionDraft.type === "transfer" ? (
                <FormSelect
                  label="To Account"
                  value={transactionDraft.to_account_id}
                  onChange={(value) =>
                    onGenericTransactionDraftChange((current) => ({
                      ...current,
                      to_account_id: value,
                    }))
                  }
                  options={[
                    {
                      label:
                        transactionDraft.type === "income"
                          ? "Use default account"
                          : "Select account",
                      value: "",
                    },
                    ...accounts
                      .filter(
                        (account) =>
                          transactionDraft.type !== "transfer" ||
                          String(account.id) !== transactionDraft.from_account_id
                      )
                      .map((account) => ({
                        label: formatAccountOptionLabel(account),
                        value: String(account.id),
                      })),
                  ]}
                />
              ) : null}
              <FormTextarea
                label="Note"
                value={transactionDraft.note}
                onChange={(value) =>
                  onGenericTransactionDraftChange((current) => ({
                    ...current,
                    note: value,
                  }))
                }
              />
            </>
          ) : (
            <>
              <FormSelect
                label="From Account"
                value={transferDraft.from_account_id}
                onChange={(value) =>
                  onTransferDraftChange((current) => ({ ...current, from_account_id: value }))
                }
                options={[
                  { label: "Select account", value: "" },
                  ...accounts.map((account) => ({
                    label: formatAccountOptionLabel(account),
                    value: String(account.id),
                  })),
                ]}
              />
              <FormSelect
                label="To Account"
                value={transferDraft.to_account_id}
                onChange={(value) =>
                  onTransferDraftChange((current) => ({ ...current, to_account_id: value }))
                }
                options={[
                  { label: "Select account", value: "" },
                  ...transferTargetAccounts.map((account) => ({
                    label: formatAccountOptionLabel(account),
                    value: String(account.id),
                  })),
                ]}
              />
              <FormInput
                label="Amount"
                inputMode="decimal"
                required
                value={transferDraft.amount}
                onChange={(value) =>
                  onTransferDraftChange((current) => ({ ...current, amount: value }))
                }
              />
              <FormInput
                label="Transfer Fee"
                inputMode="decimal"
                value={transferDraft.transfer_fee_amount}
                onChange={(value) =>
                  onTransferDraftChange((current) => ({
                    ...current,
                    transfer_fee_amount: value,
                  }))
                }
              />
              <FormInput
                label="Date"
                required
                type="date"
                value={transferDraft.date}
                onChange={(value) =>
                  onTransferDraftChange((current) => ({ ...current, date: value }))
                }
              />
              <FormTextarea
                label="Notes"
                value={transferDraft.notes}
                onChange={(value) =>
                  onTransferDraftChange((current) => ({ ...current, notes: value }))
                }
              />
              {isTransferCrossEntity ? (
                <>
                  <label className="flex items-center gap-2 rounded-lg bg-bg-subtle px-3 py-2.5 text-sm text-text">
                    <input
                      type="checkbox"
                      checked={transferDraft.mirror_as_income_expense}
                      onChange={(event) =>
                        onTransferDraftChange((current) => ({
                          ...current,
                          mirror_as_income_expense: event.target.checked,
                        }))
                      }
                    />
                    <span>Also record as expense and income</span>
                  </label>
                  {transferDraft.mirror_as_income_expense ? (
                    <>
                      <FormSelect
                        label="Source Expense Category"
                        value={transferDraft.expense_category_id}
                        onChange={(value) =>
                          onTransferDraftChange((current) => ({
                            ...current,
                            expense_category_id: value,
                          }))
                        }
                        options={[
                          { label: "Uncategorized", value: "" },
                          ...categories.map((category) => ({
                            label: category.name,
                            value: String(category.id),
                          })),
                        ]}
                      />
                      <FormSelect
                        label="Destination Income Category"
                        value={transferDraft.income_category_id}
                        onChange={(value) =>
                          onTransferDraftChange((current) => ({
                            ...current,
                            income_category_id: value,
                          }))
                        }
                        options={[
                          { label: "Uncategorized", value: "" },
                          ...incomeCategories.map((category) => ({
                            label: category.name,
                            value: String(category.id),
                          })),
                        ]}
                      />
                    </>
                  ) : null}
                </>
              ) : null}
            </>
          )}

          {error ? <p className="text-sm text-negative">{error}</p> : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-dark disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-2xs font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-sm text-text">{children}</p>
    </div>
  );
}

function MetricCard({
  accent = "default",
  comparison,
  hint,
  label,
  value,
}: {
  accent?: "default" | "negative" | "positive" | "warning";
  comparison?: ComparisonMeta | null;
  hint?: string;
  label: string;
  value: string;
}) {
  const accentClasses = {
    default: "bg-white text-text",
    negative: "bg-negative-light text-negative-dark",
    positive: "bg-positive-light text-positive-dark",
    warning: "bg-warning-light text-warning-dark",
  };

  const valueClasses = {
    default: "text-text",
    negative: "text-negative-dark",
    positive: "text-positive",
    warning: "text-warning-dark",
  };
  const comparisonClasses = {
    down: "text-negative",
    flat: "text-text-secondary",
    up: "text-positive",
  };
  const comparisonIcons = {
    down: "ri-arrow-down-line",
    flat: "ri-subtract-line",
    up: "ri-arrow-up-line",
  };

  return (
    <Card className={`p-4 ${accentClasses[accent]}`}>
      <p className="text-2xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClasses[accent]}`}>{value}</p>
      {comparison ? (
        <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${comparisonClasses[comparison.direction]}`}>
          <i className={comparisonIcons[comparison.direction]} />
          <span>{comparison.percentageLabel} vs last month</span>
        </p>
      ) : null}
      {hint ? <p className="mt-1 text-xs text-text-secondary">{hint}</p> : null}
    </Card>
  );
}

function FormInput({
  inputMode,
  label,
  list,
  onChange,
  placeholder,
  required,
  type = "text",
  value,
}: {
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  list?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-text">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        list={list}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-text outline-none transition focus:border-accent"
      />
    </label>
  );
}

function FormSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-text">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-text outline-none transition focus:border-accent"
      >
        {options.map((option) => (
          <option key={`${label}:${option.value}:${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FormTextarea({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-text">{label}</span>
      <textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-text outline-none transition focus:border-accent"
      />
    </label>
  );
}

function createEmptyExpenseDraft(entityId: string): ExpenseDraft {
  return {
    amount: "",
    entity_id: entityId,
    expense_category_id: "",
    expense_expectation: "expected",
    from_account_id: "",
    name: "",
    notes: "",
    spent_at: getTodayDateInputValue(),
  };
}

function createEmptyIncomeDraft(entityId: string): IncomeDraft {
  return {
    amount: "",
    entity_id: entityId,
    income_category_id: "",
    received_date: getTodayDateInputValue(),
    source: "",
    to_account_id: "",
  };
}

function createEmptyTransferDraft(
  accounts: Array<{
    id: number;
    name: string;
    entity_id: string;
    entity_name: string;
    currency_code: string;
  }>
): TransferDraft {
  return createDefaultTransferDraft(accounts) as TransferDraft;
}

function createEmptyDebtDraft(entityId: string): DebtDraft {
  return {
    amount: "",
    debt_category_id: "",
    entity_id: entityId,
    loan_origin: "",
    name: "",
    notes: "",
    spent_at: getTodayDateInputValue(),
    statement_month: monthKey(getTodayDateInputValue()),
  };
}

function createEmptyGenericTransactionDraft(
  type: GenericTransactionDraft["type"]
): GenericTransactionDraft {
  return {
    amount: "",
    category: "",
    created_at: getTodayDateInputValue(),
    from_account_id: "",
    note: "",
    to_account_id: "",
    type,
  };
}

function createDebtTransactionRow(
  debt: {
    id: number;
    amount: number;
    debt_category_name?: string | null;
    entity_name?: string | null;
    loan_origin?: string | null;
    name: string;
    notes?: string | null;
    spent_at: string;
  },
  currency: string
): TransactionListRow {
  return {
    amount: Number(debt.amount || 0),
    category: debt.debt_category_name || debt.loan_origin || "Debt",
    created_at: debt.spent_at,
    currency_code: currency,
    from_entity_name: debt.entity_name || null,
    id: `debt:${debt.id}`,
    note: debt.notes
      ? `${debt.name || debt.debt_category_name || "Debt"} - ${debt.notes}`
      : debt.name || debt.debt_category_name || "Debt",
    source_type: "debt",
    to_entity_name: null,
    type: "debt",
  };
}

function resolveEntityIdForDraft(
  selectedEntityId: string,
  draftEntityId: string,
  accountEntityId?: string | null
) {
  if (selectedEntityId && selectedEntityId !== ALL_ENTITIES_ID) {
    return selectedEntityId;
  }

  return draftEntityId || accountEntityId || "";
}

function formatAccountOptionLabel(account: {
  name: string;
  entity_name: string;
  currency_code: string;
}) {
  return `${account.name} • ${account.entity_name} • ${account.currency_code}`;
}

function getTodayDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeCategoryKey(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function buildCategoryMetaByName(list: CategoryRecord[], seedPrefix: string) {
  const map = new Map<string, { color: string; icon: string | null }>();

  list.forEach((category) => {
    const normalizedName = normalizeCategoryKey(category.name);
    if (!normalizedName) {
      return;
    }
    map.set(normalizedName, {
      color: resolveCategoryColor(
        category.color,
        `${seedPrefix}:${category.id}:${category.name}`
      ),
      icon: category.icon || null,
    });
  });

  return map;
}

function getTransactionGroupSection(transaction: TransactionListRow, groupBy: GroupBy) {
  if (groupBy === "category") {
    const label = String(transaction.category || "Uncategorized").trim() || "Uncategorized";
    return {
      key: `category:${label.toLowerCase()}`,
      label,
    };
  }

  if (groupBy === "type") {
    const label = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
    return {
      key: `type:${transaction.type}`,
      label,
    };
  }

  const dateKey = String(transaction.created_at).slice(0, 10);
  return {
    key: `date:${dateKey}`,
    label: formatLongDate(dateKey),
  };
}

function buildExpenseWindowSummary(
  expenses: Array<{
    amount: number;
    expense_expectation?: string | null;
    spent_at: string;
  }>,
  targetMonth: string,
  cutoffDay: number
) {
  const limitDay = Math.min(cutoffDay, getDaysInMonth(targetMonth));

  return expenses.reduce(
    (summary, expense) => {
      if (monthKey(expense.spent_at) !== targetMonth) {
        return summary;
      }
      if (getDayOfMonth(expense.spent_at) > limitDay) {
        return summary;
      }

      const amount = Number(expense.amount || 0);
      const expectation = expense.expense_expectation === "expected" ? "expected" : "unexpected";
      summary.total += amount;
      summary[expectation] += amount;
      return summary;
    },
    { total: 0, expected: 0, unexpected: 0 }
  );
}

function buildComparisonMeta(currentValue: number, previousValue: number): ComparisonMeta {
  if (currentValue === previousValue) {
    return {
      direction: "flat",
      percentageLabel: "0%",
    };
  }

  if (previousValue === 0) {
    return {
      direction: currentValue > 0 ? "up" : "down",
      percentageLabel: "100%",
    };
  }

  const change = ((currentValue - previousValue) / previousValue) * 100;

  return {
    direction: change > 0 ? "up" : "down",
    percentageLabel: `${Math.abs(change).toFixed(1)}%`,
  };
}

function getPreviousMonthKey(month: string) {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const previous = new Date(year, monthNumber - 2, 1);
  const previousYear = previous.getFullYear();
  const previousMonth = String(previous.getMonth() + 1).padStart(2, "0");
  return `${previousYear}-${previousMonth}`;
}

function getDaysInMonth(month: string) {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  return new Date(year, monthNumber, 0).getDate();
}

function getDayOfMonth(dateText: string) {
  const dayText = String(dateText).slice(8, 10);
  return Number(dayText || "0");
}
