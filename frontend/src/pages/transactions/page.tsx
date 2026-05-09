import { useEffect, useMemo, useRef, useState } from "react";
import Badge from "@/components/base/Badge";
import Card from "@/components/base/Card";
import Navbar from "@/components/feature/Navbar";
import { EmptyState, LoadingState } from "@/components/feature/PageState";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import { formatCurrency, formatLongDate, formatShortDate, monthKey, sortByDateDesc } from "@/lib/finance";
import type { CategoryRecord } from "@/types/finance";
import { buildCategoryBadgeStyle, resolveCategoryColor } from "@/utils/categoryColors";
import { monthLabel } from "@/utils/format";

type FilterType = "all" | "income" | "expense" | "transfer" | "debt";
type ExpenseExpectation = "expected" | "unexpected";
type TransactionListRow = {
  id: string | number;
  source_type: string;
  type: FilterType;
  amount: number;
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

export default function Transactions() {
  const {
    balance,
    categories,
    currentMonth,
    debtList,
    expenseList,
    incomeCategories,
    loading,
    scopedTransactions,
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
  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const monthMenuRef = useRef<HTMLDivElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const groupMenuRef = useRef<HTMLDivElement | null>(null);
  const filterAnchorRef = useRef<HTMLDivElement | null>(null);

  const currency = balance?.currency_code || "PHP";
  const sortedTransactions = useMemo(
    () => sortByDateDesc(scopedTransactions, "created_at"),
    [scopedTransactions]
  );
  const expenseRows = useMemo<TransactionListRow[]>(
    () =>
      sortByDateDesc(
        expenseList.map((expense) => ({
          id: `expense:${expense.id}`,
          source_type: "expense",
          type: "expense" as const,
          amount: Number(expense.amount || 0),
          from_account_name: expense.from_account_name || null,
          to_account_name: null,
          from_entity_name: expense.entity_name || null,
          to_entity_name: null,
          currency_code: balance?.currency_code || "PHP",
          category: expense.expense_category_name || expense.name || "Uncategorized",
          note: expense.notes
            ? `${expense.name || expense.expense_category_name || "Expense"} - ${expense.notes}`
            : expense.name || expense.expense_category_name || "Expense",
          created_at: expense.spent_at,
        })),
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
  const sourceRows =
    activeType === "expense"
      ? expenseRows
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
  const monthLabelText = selectedMonth ? monthLabel(selectedMonth) : "All months";
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
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text">Transactions</h1>
        </div>

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
                      {monthOptions.map((value) => {
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

            <div className="mt-3 grid gap-3 md:grid-cols-3">
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
            </div>
          </Card>
          </div>
        </div>

        {visibleRows.length === 0 ? (
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
    </div>
  );
}

function TransactionRowCard({
  categoryMeta,
  currency,
  expanded,
  onToggle,
  transaction,
}: {
  categoryMeta: CategoryMeta;
  currency: string;
  expanded: boolean;
  onToggle: () => void;
  transaction: TransactionListRow;
}) {
  const categoryIconStyle = buildCategoryBadgeStyle(categoryMeta.color);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-bg-subtle"
      >
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

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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
