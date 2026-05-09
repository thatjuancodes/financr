import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import AppLayoutContent from "./components/AppLayoutContent";
import TabBar from "./components/TabBar";
import Banner from "./components/ui/Banner";
import Button from "./components/ui/Button";
import useAppDashboardMetrics from "./hooks/useAppDashboardMetrics";
import {
  todayISO,
  currentMonthKey,
  formatAmountInput,
  parseAmountInput,
} from "./utils/format";
import {
  ALL_ENTITIES_VALUE,
  REPORT_HASH_PREFIX,
  buildDebtCycleMonthsFromData,
  debtBelongsToStatementCycle,
  expenseSuggestionKey,
  getCalendarMonthWindow,
  getStatementCycleWindow,
  isSuggestionSelectedForEncoding,
  isValidMonthKey,
  parseAppHashRoute,
  selectDefaultEntityId,
  summarizeDashboardEntityBalances,
} from "./utils/appState";
import { getPendingLifeInsuranceItems } from "./utils/insurance";
import {
  normalizeRecurringDayInput,
  normalizeSemiMonthlyDays,
} from "./utils/recurring";
import { normalizeDefaultAccountPreferencesForEntity } from "./utils/accounts";

const CURRENCY_OPTIONS = ["PHP", "USD", "VND", "EUR", "GBP", "JPY", "AUD", "CAD"];
const ACTIVE_VIEW_STORAGE_KEY = "finance-active-view";
const ENTITY_FILTER_STORAGE_KEY = "finance-selected-entity-id";
const TRANSACTIONS_LEGACY_VIEWS = new Set(["income", "expenses", "debts"]);

function normalizeAppView(view) {
  const normalized = String(view || "").trim().toLowerCase();
  if (TRANSACTIONS_LEGACY_VIEWS.has(normalized)) {
    return "transactions";
  }
  if (normalized === "accounts") {
    return "config";
  }
  return normalized || "balance";
}

export default function App() {
  const [isCompactLayout, setIsCompactLayout] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(max-width: 1024px)").matches;
  });
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [balance, setBalance] = useState(null);
  const [dashboardCurrentBalance, setDashboardCurrentBalance] = useState(null);
  const [dashboardCurrentBalanceSummary, setDashboardCurrentBalanceSummary] = useState([]);
  const [dashboardBalanceAccountName, setDashboardBalanceAccountName] =
    useState("");
  const [currency, setCurrency] = useState("USD");
  const [settingsSnapshot, setSettingsSnapshot] = useState(null);
  const [entities, setEntities] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState(() => {
    return localStorage.getItem(ENTITY_FILTER_STORAGE_KEY) || "";
  });
  const [activeView, setActiveView] = useState(() => {
    return normalizeAppView(localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY) || "balance");
  });
  const [incomeList, setIncomeList] = useState([]);
  const [expenseList, setExpenseList] = useState([]);
  const [recurringItems, setRecurringItems] = useState([]);
  const [pendingRecurringItems, setPendingRecurringItems] = useState([]);
  const [debtList, setDebtList] = useState([]);
  const [debtOrigins, setDebtOrigins] = useState([]);
  const [loanOriginConfigs, setLoanOriginConfigs] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [lifeInsurances, setLifeInsurances] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryRecords, setCategoryRecords] = useState([]);
  const [incomeCategoryRecords, setIncomeCategoryRecords] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expenseSort, setExpenseSort] = useState({
    column: "spent_at",
    direction: "desc",
  });
  const [debtSort, setDebtSort] = useState({
    column: "spent_at",
    direction: "desc",
  });
  const [incomeMonth, setIncomeMonth] = useState(currentMonthKey());
  const [incomeCategoryFilter, setIncomeCategoryFilter] = useState("");
  const [expenseMonth, setExpenseMonth] = useState(currentMonthKey());
  const [balanceMonth, setBalanceMonth] = useState(currentMonthKey());
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("");
  const [expenseDateFrom, setExpenseDateFrom] = useState("");
  const [expenseDateTo, setExpenseDateTo] = useState("");
  const [debtMonth, setDebtMonth] = useState(currentMonthKey());
  const [debtCategoryFilter, setDebtCategoryFilter] = useState("");
  const [selectedDebtIds, setSelectedDebtIds] = useState([]);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const isAllEntitiesSelected = String(selectedEntityId || "") === ALL_ENTITIES_VALUE;
  const selectedEntityFilterId = isAllEntitiesSelected
    ? undefined
    : selectedEntityId || undefined;
  const pendingLifeInsuranceItems = useMemo(
    () => getPendingLifeInsuranceItems(lifeInsurances),
    [lifeInsurances]
  );
  const [selectedReportMonth, setSelectedReportMonth] = useState("");
  const [selectedMonthlyReport, setSelectedMonthlyReport] = useState(null);
  const [isMonthlyReportLoading, setIsMonthlyReportLoading] = useState(false);
  const [reportsRouteMode, setReportsRouteMode] = useState("list");

  const [incomeForm, setIncomeForm] = useState({
    amount: "",
    source: "",
    received_date: todayISO(),
    to_account_id: "",
    income_category_id: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    name: "",
    notes: "",
    spent_at: todayISO(),
    from_account_id: "",
    expense_category_id: "",
    expense_expectation: "unexpected",
  });

  const [debtForm, setDebtForm] = useState({
    amount: "",
    name: "",
    loan_origin: "",
    notes: "",
    spent_at: todayISO(),
    debt_category_id: "",
  });

  const [suggestionForm, setSuggestionForm] = useState({
    category: "",
    last_amount: "",
    expense_category_id: "",
    selected_for_encoding: false,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
  });

  const [incomeCategoryForm, setIncomeCategoryForm] = useState({
    name: "",
  });

  const [recurringForm, setRecurringForm] = useState({
    type: "expense",
    amount: "",
    category: "",
    expense_category_id: "",
    income_category_id: "",
    from_account_id: "",
    to_account_id: "",
    mirror_as_income_expense: false,
    transfer_fee_amount: "",
    description: "",
    frequency: "monthly",
    semi_monthly_day_1: "15",
    semi_monthly_day_2: "30",
    next_due_date: todayISO(),
  });

  const handleIncomeFormChange = useCallback((field, value) => {
    setIncomeForm((prev) => ({
      ...prev,
      [field]: field === "amount" ? formatAmountInput(value) : value,
    }));
  }, []);

  const handleExpenseFormChange = useCallback((field, value) => {
    setExpenseForm((prev) => ({
      ...prev,
      [field]: field === "amount" ? formatAmountInput(value) : value,
    }));
  }, []);

  const handleDebtFormChange = useCallback((field, value) => {
    setDebtForm((prev) => ({
      ...prev,
      [field]: field === "amount" ? formatAmountInput(value) : value,
    }));
  }, []);

  const handleSuggestionFormChange = useCallback((field, value) => {
    setSuggestionForm((prev) => ({
      ...prev,
      [field]: field === "last_amount" ? formatAmountInput(value) : value,
    }));
  }, []);

  const handleCategoryFormChange = useCallback((value) => {
    setCategoryForm((prev) => ({ ...prev, name: value }));
  }, []);

  const handleIncomeCategoryFormChange = useCallback((value) => {
    setIncomeCategoryForm((prev) => ({ ...prev, name: value }));
  }, []);

  const handleDebtOriginSelect = useCallback((origin) => {
    setDebtForm((prev) => ({
      ...prev,
      loan_origin: origin,
    }));
  }, []);

  const handleDebtOriginSuggestionSelect = useCallback((item) => {
    setDebtForm((prev) => ({
      ...prev,
      loan_origin: item.loan_origin,
      name: item.last_name || prev.name,
      amount: formatAmountInput(String(item.last_amount ?? prev.amount ?? "")),
      debt_category_id:
        item.last_category_id !== null && item.last_category_id !== undefined
          ? item.last_category_id
          : prev.debt_category_id,
    }));
  }, []);

  const encodingSuggestions = useMemo(
    () => categories.filter((item) => isSuggestionSelectedForEncoding(item)),
    [categories]
  );

  const nameMap = useMemo(() => {
    const map = new Map();
    encodingSuggestions.forEach((item) => {
      const name = typeof item?.category === "string" ? item.category.trim() : "";
      if (!name) {
        return;
      }
      const existing = map.get(name);
      if (!existing || Number(item?.count ?? 0) > Number(existing?.count ?? 0)) {
        map.set(name, item);
      }
    });
    return map;
  }, [encodingSuggestions]);

  const nameMapByCategory = useMemo(() => {
    const map = new Map();
    encodingSuggestions.forEach((item) => {
      const name = typeof item?.category === "string" ? item.category.trim() : "";
      if (!name) {
        return;
      }
      map.set(expenseSuggestionKey(name, item?.expense_category_id), item);
    });
    return map;
  }, [encodingSuggestions]);

  const allNameOptions = useMemo(() => {
    const names = new Set();
    categories.forEach((item) => names.add(item.category));
    return Array.from(names).sort();
  }, [categories]);

  const expenseNameOptions = useMemo(() => {
    const names = new Set();
    encodingSuggestions.forEach((item) => names.add(item.category));
    return Array.from(names).sort();
  }, [encodingSuggestions]);

  const loanOriginOptions = useMemo(() => {
    const origins = new Set();
    debtOrigins.forEach((item) => {
      if (item.loan_origin) {
        origins.add(item.loan_origin);
      }
    });
    loanOriginConfigs.forEach((item) => {
      if (item.loan_origin) {
        origins.add(item.loan_origin);
      }
    });
    return Array.from(origins).sort();
  }, [debtOrigins, loanOriginConfigs]);

  const loanOriginConfigMap = useMemo(() => {
    return new Map(
      loanOriginConfigs
        .filter((item) => item.loan_origin)
        .map((item) => [item.loan_origin, item])
    );
  }, [loanOriginConfigs]);

  const buildMonths = (items, field) => {
    const months = new Set([currentMonthKey()]);
    items.forEach((item) => {
      const value = item[field];
      if (value) {
        months.add(value.slice(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  };

  const incomeMonths = useMemo(
    () => buildMonths(incomeList, "received_date"),
    [incomeList]
  );

  const expenseMonths = useMemo(
    () => buildMonths(expenseList, "spent_at"),
    [expenseList]
  );

  const debtMonths = useMemo(
    () => buildDebtCycleMonthsFromData(debtList, loanOriginConfigs),
    [debtList, loanOriginConfigs]
  );

  const balanceMonths = useMemo(() => {
    const months = new Set([...incomeMonths, ...expenseMonths, ...debtMonths]);
    if (months.size === 0) {
      months.add(currentMonthKey());
    }
    return Array.from(months).sort().reverse();
  }, [incomeMonths, expenseMonths, debtMonths]);

  const filteredIncome = useMemo(() => {
    return incomeList.filter((item) => {
      const monthMatch = (item.received_date || "").slice(0, 7) === incomeMonth;
      const categoryMatch =
        !incomeCategoryFilter ||
        String(item.income_category_id ?? "") === incomeCategoryFilter;
      return monthMatch && categoryMatch;
    });
  }, [incomeList, incomeMonth, incomeCategoryFilter]);

  const filteredExpenses = useMemo(() => {
    return expenseList.filter((item) => {
      const spentAt = String(item?.spent_at || "").trim();
      const monthMatch = !expenseMonth || spentAt.slice(0, 7) === expenseMonth;
      const categoryMatch =
        !expenseCategoryFilter ||
        String(item.expense_category_id ?? "") === expenseCategoryFilter;
      const dateFromMatch = !expenseDateFrom || spentAt >= expenseDateFrom;
      const dateToMatch = !expenseDateTo || spentAt <= expenseDateTo;
      return monthMatch && categoryMatch && dateFromMatch && dateToMatch;
    });
  }, [expenseList, expenseMonth, expenseCategoryFilter, expenseDateFrom, expenseDateTo]);

  const filteredDebts = useMemo(() => {
    return debtList.filter((item) => {
      const monthMatch = debtBelongsToStatementCycle(
        item,
        debtMonth,
        loanOriginConfigMap
      );
      const categoryMatch =
        !debtCategoryFilter ||
        String(item.debt_category_id ?? "") === debtCategoryFilter;
      return monthMatch && categoryMatch;
    });
  }, [debtList, debtMonth, debtCategoryFilter, loanOriginConfigMap]);

  const incomeTotal = useMemo(
    () => filteredIncome.reduce((sum, item) => sum + (item.amount ?? 0), 0),
    [filteredIncome]
  );

  const expenseTotal = useMemo(
    () => filteredExpenses.reduce((sum, item) => sum + (item.amount ?? 0), 0),
    [filteredExpenses]
  );
  const debtTotal = useMemo(
    () => filteredDebts.reduce((sum, item) => sum + (item.amount ?? 0), 0),
    [filteredDebts]
  );

  const debtStatementCycleTotals = useMemo(() => {
    const grouped = new Map();
    filteredDebts.forEach((item) => {
      const loanOrigin =
        typeof item.loan_origin === "string" && item.loan_origin.trim()
          ? item.loan_origin.trim()
          : "Unassigned";
      const existing = grouped.get(loanOrigin) || {
        loan_origin: loanOrigin,
        statement_month: debtMonth,
        total: 0,
        count: 0,
      };
      existing.total += Number(item.amount ?? 0);
      existing.count += 1;
      grouped.set(loanOrigin, existing);
    });
    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }, [filteredDebts, debtMonth]);
  const {
    averageDebtPerMonth,
    averageExpensePerMonth,
    averageIncomePerMonth,
    balanceDebtAccumulated,
    balanceDebtPaid,
    balanceDebtRecords,
    balanceDebtTotal,
    balanceMonthIncomeTotal,
    balanceMonthSavings,
    balanceStatementDebts,
    balanceTopDebtCategories,
    balanceTopDebtCategoriesTotal,
    balanceTopDebtMonths,
    balanceTopRecentDebtCategories,
    balanceTopRecentDebtCategoriesTotal,
    bufferMonths,
    currentBalanceAmount,
    debtCategoryBreakdown,
    debtCategoryBreakdownTotal,
    daysBeforeNextIncome,
    dailyBalanceTrendSeries,
    dailyTrendSeries,
    expenseBreakdownTotal,
    expenseCategoryBreakdown,
    monthlyBalanceTrendSeries,
    monthlyRecurringExpenseTotal,
    monthlyRecurringIncomeTotal,
    monthlyTrendSeries,
    upcomingRecurringIncomeTotal,
    projectedMonthlySavingsGrowth,
    safeToSpendAmount,
    sixMonthProjectionSeries,
    thirtyDayProjectionSeries,
    topRecentDebtPeriodLabel,
  } = useAppDashboardMetrics({
    balance,
    balanceMonth,
    balanceMonths,
    dashboardCurrentBalance,
    debtList,
    expenseList,
    incomeList,
    loanOriginConfigMap,
    recurringItems,
    selectedEntityId,
  });

  const sortedExpenses = useMemo(() => {
    const copy = [...filteredExpenses];
    const { column, direction } = expenseSort;
    copy.sort((a, b) => {
      let primaryCmp = 0;
      if (column === "spent_at") {
        primaryCmp = a.spent_at.localeCompare(b.spent_at);
      } else if (column === "name") {
        primaryCmp = a.name.localeCompare(b.name);
      } else if (column === "amount") {
        primaryCmp = (a.amount ?? 0) - (b.amount ?? 0);
      }
      const aCreated = a.created_at || "";
      const bCreated = b.created_at || "";
      const secondaryCmp = aCreated.localeCompare(bCreated);
      if (primaryCmp === 0) {
        return secondaryCmp;
      }
      return direction === "asc" ? primaryCmp : -primaryCmp;
    });
    return copy;
  }, [filteredExpenses, expenseSort]);

  const sortedDebts = useMemo(() => {
    const copy = [...filteredDebts];
    const { column, direction } = debtSort;
    copy.sort((a, b) => {
      let primaryCmp = 0;
      if (column === "spent_at") {
        primaryCmp = a.spent_at.localeCompare(b.spent_at);
      } else if (column === "name") {
        primaryCmp = a.name.localeCompare(b.name);
      } else if (column === "amount") {
        primaryCmp = (a.amount ?? 0) - (b.amount ?? 0);
      }
      const aCreated = a.created_at || "";
      const bCreated = b.created_at || "";
      const secondaryCmp = aCreated.localeCompare(bCreated);
      if (primaryCmp === 0) {
        return secondaryCmp;
      }
      return direction === "asc" ? primaryCmp : -primaryCmp;
    });
    return copy;
  }, [filteredDebts, debtSort]);

  useEffect(() => {
    const visibleDebtIds = new Set(filteredDebts.map((item) => item.id));
    setSelectedDebtIds((prev) => {
      const next = prev.filter((id) => visibleDebtIds.has(id));
      if (next.length === prev.length) {
        return prev;
      }
      return next;
    });
  }, [filteredDebts]);

  const toggleExpenseSort = (column) => {
    setExpenseSort((prev) => {
      if (prev.column === column) {
        return {
          column,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { column, direction: "desc" };
    });
  };

  const toggleDebtSort = (column) => {
    setDebtSort((prev) => {
      if (prev.column === column) {
        return {
          column,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { column, direction: "desc" };
    });
  };

  const moneyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
      }),
    [currency]
  );

  const formatMoney = (value) => moneyFormatter.format(Number(value ?? 0));
  const formatMoneyForCurrency = useCallback((value, currencyCode = currency) => {
    const resolvedCurrency =
      String(currencyCode || currency || "PHP").trim().toUpperCase() || "PHP";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: resolvedCurrency,
    }).format(Number(value ?? 0));
  }, [currency]);
  const formatCurrencySummary = useCallback((summary) => {
    const rows = Array.isArray(summary) ? summary : [];
    if (rows.length === 0) {
      return formatMoneyForCurrency(0, currency);
    }
    return rows
      .map((item) => formatMoneyForCurrency(item.total, item.currency_code))
      .join(" • ");
  }, [currency, formatMoneyForCurrency]);
  const dashboardDisplayCurrencyCode = useMemo(() => {
    if (dashboardCurrentBalanceSummary.length !== 1) {
      return null;
    }
    return String(dashboardCurrentBalanceSummary[0]?.currency_code || "")
      .trim()
      .toUpperCase() || null;
  }, [dashboardCurrentBalanceSummary]);
  const formatDashboardMoney = useCallback((value) => {
    return formatMoneyForCurrency(value, dashboardDisplayCurrencyCode || currency);
  }, [currency, dashboardDisplayCurrencyCode, formatMoneyForCurrency]);

  const syncEntities = (entityRows) => {
    const normalizedEntities = Array.isArray(entityRows) ? entityRows : [];
    setEntities(normalizedEntities);
    setSelectedEntityId((prev) => selectDefaultEntityId(normalizedEntities, prev));
  };

  const refreshAll = async () => {
    setError("");
    try {
      const [
        settings,
        balanceData,
        entityRows,
        income,
        expenses,
        recurring,
        pendingRecurring,
        debts,
        debtOriginsData,
        loanOriginConfigRows,
        institutionRows,
        lifeInsuranceRows,
        budgetRows,
        cats,
        categoryRows,
        incomeCategoryRows,
        monthlyReportRows,
        accountRows,
        allAccountRows,
      ] = await Promise.all([
        api.getSettings(),
        api.getBalance({
          entity_id: selectedEntityFilterId,
        }),
        api.getEntities(),
        api.getIncome({
          entity_id: selectedEntityFilterId,
        }),
        api.getExpenses({
          entity_id: selectedEntityFilterId,
        }),
        api.getRecurringItems({
          entity_id: selectedEntityFilterId,
        }),
        api.getPendingRecurringItems({
          entity_id: selectedEntityFilterId,
        }),
        api.getDebts({
          entity_id: selectedEntityFilterId,
        }),
        api.getDebtOrigins({
          entity_id: selectedEntityFilterId,
        }),
        api.getLoanOriginConfigs({
          entity_id: selectedEntityFilterId,
        }),
        api.getInstitutions(),
        api.getLifeInsurances({
          entity_id: selectedEntityFilterId,
        }),
        api.getBudgets({
          entity_id: selectedEntityFilterId,
        }),
        api.getExpenseCategories(),
        api.getCategories(),
        api.getIncomeCategories(),
        api.getMonthlyReports({
          entity_id: selectedEntityFilterId,
        }),
        api.getAccounts({
          entity_id: selectedEntityFilterId,
        }),
        api.getAccounts(),
      ]);
      setSettingsSnapshot(settings || null);
      setCurrency(settings.currency_code ?? "USD");
      setBalance(balanceData);
      const dashboardSummary = summarizeDashboardEntityBalances(accountRows);
      setDashboardCurrentBalanceSummary(dashboardSummary);
      setDashboardCurrentBalance(
        dashboardSummary.length <= 1 ? Number(dashboardSummary[0]?.total ?? 0) : null
      );
      if (isAllEntitiesSelected) {
        setDashboardBalanceAccountName("All Entities");
      } else {
        const selectedEntity = (Array.isArray(entityRows) ? entityRows : []).find(
          (item) => String(item?.id) === String(selectedEntityId || "")
        );
        setDashboardBalanceAccountName(String(selectedEntity?.name || ""));
      }
      syncEntities(entityRows);
      setIncomeList(income);
      setExpenseList(expenses);
      setRecurringItems(recurring);
      setPendingRecurringItems(pendingRecurring);
      setDebtList(debts);
      setDebtOrigins(debtOriginsData);
      setLoanOriginConfigs(loanOriginConfigRows);
      setInstitutions(institutionRows);
      setLifeInsurances(Array.isArray(lifeInsuranceRows) ? lifeInsuranceRows : []);
      setBudgets(Array.isArray(budgetRows) ? budgetRows : []);
      setCategories(cats);
      setCategoryRecords(categoryRows);
      setIncomeCategoryRecords(incomeCategoryRows);
      setAllAccounts(Array.isArray(allAccountRows) ? allAccountRows : []);
      const reportItems = Array.isArray(monthlyReportRows?.items)
        ? monthlyReportRows.items
        : [];
      setMonthlyReports(reportItems);
      if (
        selectedReportMonth &&
        reportItems.some((item) => item.month_key === selectedReportMonth)
      ) {
        setSelectedReportMonth(selectedReportMonth);
      } else {
        setSelectedReportMonth((prev) =>
          reportsRouteMode === "detail" && prev ? prev : ""
        );
      }

      const nextIncomeMonths = buildMonths(income, "received_date");
      const nextExpenseMonths = buildMonths(expenses, "spent_at");
      const nextDebtMonths = buildDebtCycleMonthsFromData(
        debts,
        loanOriginConfigRows
      );
      const nextBalanceMonths = Array.from(
        new Set([...nextIncomeMonths, ...nextExpenseMonths, ...nextDebtMonths])
      )
        .sort()
        .reverse();

      if (!nextIncomeMonths.includes(incomeMonth)) {
        setIncomeMonth(nextIncomeMonths[0] || currentMonthKey());
      }
      if (expenseMonth && !nextExpenseMonths.includes(expenseMonth)) {
        setExpenseMonth(nextExpenseMonths[0] || currentMonthKey());
      }
      if (!nextDebtMonths.includes(debtMonth)) {
        setDebtMonth(nextDebtMonths[0] || currentMonthKey());
      }
      const validCategoryIds = new Set(
        categoryRows.map((item) => String(item.id))
      );
      const validIncomeCategoryIds = new Set(
        incomeCategoryRows.map((item) => String(item.id))
      );
      if (
        incomeCategoryFilter &&
        !validIncomeCategoryIds.has(incomeCategoryFilter)
      ) {
        setIncomeCategoryFilter("");
      }
      if (
        expenseCategoryFilter &&
        !validCategoryIds.has(expenseCategoryFilter)
      ) {
        setExpenseCategoryFilter("");
      }
      if (debtCategoryFilter && !validCategoryIds.has(debtCategoryFilter)) {
        setDebtCategoryFilter("");
      }
      if (!nextBalanceMonths.includes(balanceMonth)) {
        setBalanceMonth(nextBalanceMonths[0] || currentMonthKey());
      }
    } catch (err) {
      setError(err.message || "Failed to load");
    }
  };

  useEffect(() => {
    refreshAll();
  }, [selectedEntityId, activeView]);

  const expenseAccountOptions = useMemo(() => {
    const normalizedEntityId = String(selectedEntityFilterId || "").trim();
    if (!normalizedEntityId) {
      return Array.isArray(allAccounts) ? allAccounts : [];
    }
    return (Array.isArray(allAccounts) ? allAccounts : []).filter(
      (account) => String(account?.entity_id || "") === normalizedEntityId
    );
  }, [allAccounts, selectedEntityFilterId]);

  const incomeAccountOptions = useMemo(() => {
    const normalizedEntityId = String(selectedEntityFilterId || "").trim();
    if (!normalizedEntityId) {
      return Array.isArray(allAccounts) ? allAccounts : [];
    }
    return (Array.isArray(allAccounts) ? allAccounts : []).filter(
      (account) => String(account?.entity_id || "") === normalizedEntityId
    );
  }, [allAccounts, selectedEntityFilterId]);

  const defaultIncomeAccountId = useMemo(() => {
    const defaults = normalizeDefaultAccountPreferencesForEntity(
      settingsSnapshot,
      allAccounts,
      selectedEntityFilterId || ""
    );
    return String(defaults?.default_income_account_id || "");
  }, [settingsSnapshot, allAccounts, selectedEntityFilterId]);

  const defaultIncomeAccountOption = useMemo(() => {
    if (!defaultIncomeAccountId) {
      return null;
    }
    return (
      (Array.isArray(incomeAccountOptions) ? incomeAccountOptions : []).find(
        (account) => String(account?.id || "") === defaultIncomeAccountId
      ) || null
    );
  }, [incomeAccountOptions, defaultIncomeAccountId]);

  const defaultExpenseAccountId = useMemo(() => {
    const defaults = normalizeDefaultAccountPreferencesForEntity(
      settingsSnapshot,
      allAccounts,
      selectedEntityFilterId || ""
    );
    return String(defaults?.default_expense_account_id || "");
  }, [settingsSnapshot, allAccounts, selectedEntityFilterId]);

  const defaultExpenseAccountOption = useMemo(() => {
    if (!defaultExpenseAccountId) {
      return null;
    }
    return (
      (Array.isArray(expenseAccountOptions) ? expenseAccountOptions : []).find(
        (account) => String(account?.id || "") === defaultExpenseAccountId
      ) || null
    );
  }, [expenseAccountOptions, defaultExpenseAccountId]);

  useEffect(() => {
    setIncomeForm((prev) => {
      const validAccountIds = new Set(
        (Array.isArray(incomeAccountOptions) ? incomeAccountOptions : []).map((account) =>
          String(account?.id || "")
        )
      );
      const currentAccountId = String(prev?.to_account_id || "").trim();
      const fallbackAccountId = String(defaultIncomeAccountId || "").trim();

      if (currentAccountId && validAccountIds.has(currentAccountId)) {
        return prev;
      }
      if (!currentAccountId && !fallbackAccountId) {
        return prev;
      }
      const nextAccountId = fallbackAccountId || "";
      if (currentAccountId === nextAccountId) {
        return prev;
      }
      return {
        ...prev,
        to_account_id: nextAccountId,
      };
    });
  }, [incomeAccountOptions, defaultIncomeAccountId, selectedEntityFilterId]);

  useEffect(() => {
    setExpenseForm((prev) => {
      const validAccountIds = new Set(
        (Array.isArray(expenseAccountOptions) ? expenseAccountOptions : []).map((account) =>
          String(account?.id || "")
        )
      );
      const currentAccountId = String(prev?.from_account_id || "").trim();
      const fallbackAccountId = String(defaultExpenseAccountId || "").trim();

      if (currentAccountId && validAccountIds.has(currentAccountId)) {
        return prev;
      }
      if (!currentAccountId && !fallbackAccountId) {
        return prev;
      }
      const nextAccountId = fallbackAccountId || "";
      if (currentAccountId === nextAccountId) {
        return prev;
      }
      return {
        ...prev,
        from_account_id: nextAccountId,
      };
    });
  }, [expenseAccountOptions, defaultExpenseAccountId, selectedEntityFilterId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const applyHashRoute = () => {
      const route = parseAppHashRoute(window.location.hash);
      if (!route) {
        return;
      }
      const normalizedView = normalizeAppView(route.view);
      setActiveView(normalizedView);
      if (normalizedView === "reports") {
        setReportsRouteMode(route.reportsMode || "list");
        setSelectedReportMonth(route.monthKey || "");
      } else {
        setReportsRouteMode("list");
      }
    };

    applyHashRoute();
    window.addEventListener("hashchange", applyHashRoute);
    return () => window.removeEventListener("hashchange", applyHashRoute);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (reportsRouteMode !== "detail" || !selectedReportMonth) {
      setSelectedMonthlyReport(null);
      return () => {
        cancelled = true;
      };
    }

    setIsMonthlyReportLoading(true);
    api
      .getMonthlyReport(selectedReportMonth, {
        entity_id: selectedEntityFilterId,
      })
      .then((record) => {
        if (cancelled) {
          return;
        }
        setSelectedMonthlyReport(record);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        setError(err.message || "Failed to load monthly report");
        setSelectedMonthlyReport(null);
      })
      .finally(() => {
        if (!cancelled) {
          setIsMonthlyReportLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEntityFilterId, selectedReportMonth, reportsRouteMode]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, activeView);
  }, [activeView]);

  useEffect(() => {
    const normalized = String(selectedEntityId || "").trim();
    if (normalized) {
      localStorage.setItem(ENTITY_FILTER_STORAGE_KEY, normalized);
      return;
    }
    localStorage.removeItem(ENTITY_FILTER_STORAGE_KEY);
  }, [selectedEntityId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 1024px)");
    const handleChange = (event) => {
      setIsCompactLayout(event.matches);
    };

    setIsCompactLayout(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    setIsFormModalOpen(false);
  }, [activeView, isCompactLayout]);

  const handleCurrencySubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.setCurrency(currency);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to update currency");
    }
  };

  const handleIncomeSubmit = async (event) => {
    event?.preventDefault?.();
    setError("");
    try {
      await api.addIncome({
        amount: parseAmountInput(incomeForm.amount),
        source: incomeForm.source.trim(),
        received_date: incomeForm.received_date,
        entity_id: selectedEntityFilterId,
        to_account_id:
          incomeForm.to_account_id === "" ? null : Number(incomeForm.to_account_id),
        income_category_id:
          incomeForm.income_category_id === ""
            ? null
            : incomeForm.income_category_id,
      });
      setIncomeForm({
        amount: "",
        source: "",
        received_date: todayISO(),
        to_account_id: incomeForm.to_account_id,
        income_category_id: incomeForm.income_category_id,
      });
      setIsFormModalOpen(false);
      await refreshAll();
      return true;
    } catch (err) {
      setError(err.message || "Failed to add income");
      return false;
    }
  };

  const handleExpenseSubmit = async (event) => {
    event?.preventDefault?.();
    setError("");
    try {
      await api.addExpense({
        amount: parseAmountInput(expenseForm.amount),
        name: expenseForm.name.trim(),
        notes: expenseForm.notes.trim() || null,
        spent_at: expenseForm.spent_at,
        entity_id: selectedEntityFilterId,
        from_account_id:
          expenseForm.from_account_id === "" ? null : Number(expenseForm.from_account_id),
        expense_category_id:
          expenseForm.expense_category_id === ""
            ? null
            : expenseForm.expense_category_id,
        expense_expectation:
          expenseForm.expense_expectation === "expected"
            ? "expected"
            : "unexpected",
      });
      setExpenseForm({
        amount: "",
        name: "",
        notes: "",
        spent_at: expenseForm.spent_at,
        from_account_id: expenseForm.from_account_id,
        expense_category_id: expenseForm.expense_category_id,
        expense_expectation:
          expenseForm.expense_expectation === "expected"
            ? "expected"
            : "unexpected",
      });
      setIsFormModalOpen(false);
      await refreshAll();
      return true;
    } catch (err) {
      setError(err.message || "Failed to add expense");
      return false;
    }
  };

  const handleDebtSubmit = async (event) => {
    event?.preventDefault?.();
    setError("");
    try {
      await api.addDebt({
        amount: parseAmountInput(debtForm.amount),
        name: debtForm.name.trim(),
        loan_origin: debtForm.loan_origin.trim() || null,
        notes: debtForm.notes.trim() || null,
        spent_at: debtForm.spent_at,
        entity_id: selectedEntityFilterId,
        debt_category_id:
          debtForm.debt_category_id === "" ? null : debtForm.debt_category_id,
      });
      setDebtForm({
        amount: "",
        name: "",
        loan_origin: "",
        notes: "",
        spent_at: debtForm.spent_at,
        debt_category_id: debtForm.debt_category_id,
      });
      setIsFormModalOpen(false);
      await refreshAll();
      return true;
    } catch (err) {
      setError(err.message || "Failed to add debt");
      return false;
    }
  };

  const handleDebtCsvImport = async (payload) => {
    setError("");
    try {
      const result = await api.importDebtCsv({
        ...payload,
        entity_id: selectedEntityFilterId,
      });
      await refreshAll();
      const importedCount = Number(result?.imported_count ?? 0);
      const skippedCount = Number(result?.skipped_count ?? 0);
      const parts = [
        `Imported ${importedCount} debt row${importedCount === 1 ? "" : "s"}.`,
      ];
      if (skippedCount > 0) {
        parts.push(`Skipped ${skippedCount} invalid row${skippedCount === 1 ? "" : "s"}.`);
      }
      if (Array.isArray(result?.errors) && result.errors.length > 0) {
        const first = result.errors[0];
        if (first?.line && first?.error) {
          parts.push(`First issue at line ${first.line}: ${first.error}.`);
        }
      }
      setNotice(parts.join(" "));
    } catch (err) {
      setError(err.message || "Failed to import debt CSV");
      throw err;
    }
  };

  const handlePayoffLoanOrigin = async (payload) => {
    setError("");
    try {
      const result = await api.payoffDebtByOrigin({
        ...payload,
        entity_id: selectedEntityFilterId,
      });
      setNotice(
        `Recorded debt payment for ${payload.loan_origin}: ${formatMoney(payload.amount)} on ${payload.payment_date}.`
      );
      await refreshAll();
      return result;
    } catch (err) {
      setError(err.message || "Failed to record debt payoff");
      throw err;
    }
  };

  const handleDeleteIncome = async (id) => {
    setError("");
    try {
      await api.deleteIncome(id);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to delete income");
    }
  };

  const handleUpdateIncome = async (id, payload) => {
    setError("");
    try {
      await api.updateIncome(id, payload);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to update income");
      throw err;
    }
  };

  const handleIncomeCategoryUpdate = async (id, category) => {
    setError("");
    try {
      await api.updateIncomeCategory(id, category);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to update income category");
    }
  };

  const handleDeleteExpense = async (id) => {
    setError("");
    try {
      await api.deleteExpense(id);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to delete expense");
    }
  };

  const handleUpdateExpense = async (id, payload) => {
    setError("");
    try {
      await api.updateExpense(id, payload);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to update expense");
      throw err;
    }
  };

  const handleDeleteDebt = async (id) => {
    setError("");
    try {
      await api.deleteDebt(id);
      setSelectedDebtIds((prev) => prev.filter((itemId) => itemId !== id));
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to delete debt");
    }
  };

  const handleUpdateDebt = async (id, payload) => {
    setError("");
    try {
      await api.updateDebt(id, payload);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to update debt");
      throw err;
    }
  };

  const handleDebtRowSelectionChange = (id, checked) => {
    setSelectedDebtIds((prev) => {
      if (checked) {
        if (prev.includes(id)) {
          return prev;
        }
        return [...prev, id];
      }
      return prev.filter((itemId) => itemId !== id);
    });
  };

  const handleDebtSelectAllChange = (checked, targetIds = null) => {
    const visibleIds = Array.isArray(targetIds)
      ? targetIds
      : filteredDebts.map((item) => item.id);
    setSelectedDebtIds((prev) => {
      if (checked) {
        const merged = new Set(prev);
        visibleIds.forEach((id) => merged.add(id));
        return Array.from(merged);
      }
      const visibleSet = new Set(visibleIds);
      return prev.filter((id) => !visibleSet.has(id));
    });
  };

  const handleDeleteSelectedDebts = async () => {
    if (selectedDebtIds.length === 0) {
      return;
    }
    setError("");
    try {
      const ids = [...selectedDebtIds];
      await Promise.all(ids.map((id) => api.deleteDebt(id)));
      setSelectedDebtIds([]);
      setNotice(
        `Removed ${ids.length} debt record${ids.length === 1 ? "" : "s"}.`
      );
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to delete selected debts");
    }
  };

  const handleExpenseCategoryUpdate = async (id, category) => {
    setError("");
    try {
      await api.updateExpenseCategory(id, category);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to update expense category");
    }
  };

  const handleExpenseExpectationUpdate = async (id, expenseExpectation) => {
    setError("");
    try {
      await api.updateExpenseExpectation(id, expenseExpectation);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to update expense expectation");
    }
  };

  const handleDebtCategoryUpdate = async (id, category) => {
    setError("");
    try {
      await api.updateDebtCategory(id, category);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to update debt category");
    }
  };

  const handleLoanOriginConfigSave = async (payload) => {
    setError("");
    try {
      await api.saveLoanOriginConfig(payload);
      setNotice(`Saved debt statement settings for ${payload.loan_origin}.`);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to save debt statement settings");
      throw err;
    }
  };

  const handleLoanOriginConfigDelete = async (loanOrigin) => {
    setError("");
    try {
      const result = await api.deleteLoanOriginConfig(loanOrigin);
      const clearedCount = Number(result?.cleared_debts ?? 0);
      setNotice(
        `Deleted loan origin ${loanOrigin}.${clearedCount > 0 ? ` Cleared ${clearedCount} debt record${clearedCount === 1 ? "" : "s"}.` : ""}`
      );
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to delete loan origin config");
      throw err;
    }
  };

  const handleInstitutionSave = async (payload) => {
    setError("");
    try {
      if (payload?.id) {
        await api.updateInstitution(payload.id, payload);
      } else {
        await api.createInstitution(payload);
      }
      setNotice(`Saved institution ${payload.name}.`);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to save institution");
      throw err;
    }
  };

  const handleInstitutionDelete = async (id, name) => {
    setError("");
    try {
      await api.deleteInstitution(id);
      setNotice(`Deactivated institution ${name}.`);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to delete institution");
      throw err;
    }
  };

  const handleCreateLifeInsurance = async (payload) => {
    setError("");
    try {
      await api.addLifeInsurance(payload);
      setNotice(`Added life insurance ${payload.policy_name}.`);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to add life insurance");
      throw err;
    }
  };

  const handleUpdateLifeInsurance = async (id, payload) => {
    setError("");
    try {
      await api.updateLifeInsurance(id, payload);
      setNotice(`Saved life insurance ${payload.policy_name}.`);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to update life insurance");
      throw err;
    }
  };

  const handleDeleteLifeInsurance = async (id) => {
    setError("");
    try {
      await api.deleteLifeInsurance(id);
      setNotice("Deleted life insurance.");
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to delete life insurance");
      throw err;
    }
  };

  const handleCreateBudget = async (payload) => {
    setError("");
    try {
      await api.addBudget(payload);
      setNotice(`Added budget ${payload.name}.`);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to add budget");
      throw err;
    }
  };

  const handleUpdateBudget = async (id, payload) => {
    setError("");
    try {
      await api.updateBudget(id, payload);
      setNotice(`Saved budget ${payload.name}.`);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to update budget");
      throw err;
    }
  };

  const handleDeleteBudget = async (id) => {
    setError("");
    try {
      await api.deleteBudget(id);
      setNotice("Deleted budget.");
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to delete budget");
      throw err;
    }
  };

  const handleNameChange = (value) => {
    const next = { ...expenseForm, name: value };
    const categoryAwareMatch = nameMapByCategory.get(
      expenseSuggestionKey(value, expenseForm.expense_category_id)
    );
    const match = categoryAwareMatch || nameMap.get(value);
    if (match && !expenseForm.amount) {
      next.amount = formatAmountInput(String(match.last_amount ?? ""));
    }
    setExpenseForm(next);
  };

  const handleDebtNameChange = (value) => {
    const next = { ...debtForm, name: value };
    const match = nameMap.get(value);
    if (match && !debtForm.amount) {
      next.amount = formatAmountInput(String(match.last_amount ?? ""));
    }
    setDebtForm(next);
  };

  const applyExpenseSuggestionToForm = (item) => {
    const nextAmount = formatAmountInput(String(item?.last_amount ?? ""));
    setExpenseForm((prev) => ({
      ...prev,
      name: item?.category ?? prev.name,
      amount: nextAmount,
      expense_category_id:
        item?.expense_category_id === null ||
        item?.expense_category_id === undefined ||
        item?.expense_category_id === ""
          ? ""
          : Number(item.expense_category_id),
    }));
  };

  const handleRecurringFormChange = (field, value) => {
    setRecurringForm((prev) => {
      const next = { ...prev };
      if (field === "amount" || field === "transfer_fee_amount") {
        next[field] = formatAmountInput(value);
      } else if (field === "semi_monthly_day_1" || field === "semi_monthly_day_2") {
        next[field] = normalizeRecurringDayInput(value);
      } else {
        next[field] = value;
      }

      if (field === "type") {
        if (value !== "expense") {
          next.expense_category_id = "";
        }
        if (value !== "income") {
          next.income_category_id = "";
        }
        if (value !== "transfer") {
          next.from_account_id = "";
          next.to_account_id = "";
          next.mirror_as_income_expense = false;
          next.transfer_fee_amount = "";
        }
        if (value === "expense" && next.frequency === "semi_monthly") {
          next.frequency = "monthly";
        }
        if (value === "transfer" && next.frequency === "semi_monthly") {
          next.frequency = "monthly";
        }
      }

      if (field === "frequency" && value === "semi_monthly") {
        if (next.type !== "income") {
          next.frequency = "monthly";
        } else {
          if (!String(next.semi_monthly_day_1 ?? "").trim()) {
            next.semi_monthly_day_1 = "15";
          }
          if (!String(next.semi_monthly_day_2 ?? "").trim()) {
            next.semi_monthly_day_2 = "30";
          }
        }
      }

      if (
        next.type === "transfer" &&
        next.from_account_id &&
        next.to_account_id &&
        String(next.from_account_id) === String(next.to_account_id)
      ) {
        next.to_account_id = "";
      }

      return next;
    });
  };

  const handleRecurringSubmit = async (event) => {
    event?.preventDefault?.();
    setError("");
    const normalizedSemiMonthlyDays = normalizeSemiMonthlyDays(
      recurringForm.semi_monthly_day_1,
      recurringForm.semi_monthly_day_2
    );
    if (
      recurringForm.type === "income" &&
      recurringForm.frequency === "semi_monthly" &&
      !normalizedSemiMonthlyDays.valid
    ) {
      setError(
        "Semi-monthly income requires two distinct cutoff days between 1 and 31."
      );
      return false;
    }
    if (recurringForm.type === "transfer") {
      const fromAccountId = Number(recurringForm.from_account_id);
      const toAccountId = Number(recurringForm.to_account_id);
      const transferFeeAmount = Number(
        parseAmountInput(recurringForm.transfer_fee_amount || "0")
      );
      if (!Number.isInteger(fromAccountId) || fromAccountId <= 0) {
        setError("Select a source account for the recurring transfer.");
        return false;
      }
      if (!Number.isInteger(toAccountId) || toAccountId <= 0) {
        setError("Select a destination account for the recurring transfer.");
        return false;
      }
      if (fromAccountId === toAccountId) {
        setError("Recurring transfer must use two different accounts.");
        return false;
      }
      if (!Number.isFinite(transferFeeAmount) || transferFeeAmount < 0) {
        setError("Enter a valid recurring transfer fee.");
        return false;
      }
    }
    try {
      await api.addRecurringItem({
        type: recurringForm.type,
        amount: parseAmountInput(recurringForm.amount),
        category: recurringForm.category.trim(),
        entity_id: selectedEntityFilterId,
        expense_category_id:
          (recurringForm.type === "expense" || recurringForm.type === "transfer") &&
          recurringForm.expense_category_id !== ""
            ? Number(recurringForm.expense_category_id)
            : null,
        income_category_id:
          (recurringForm.type === "income" || recurringForm.type === "transfer") &&
          recurringForm.income_category_id !== ""
            ? Number(recurringForm.income_category_id)
            : null,
        from_account_id:
          recurringForm.type === "transfer" && recurringForm.from_account_id !== ""
            ? Number(recurringForm.from_account_id)
            : null,
        to_account_id:
          recurringForm.type === "transfer" && recurringForm.to_account_id !== ""
            ? Number(recurringForm.to_account_id)
            : null,
        mirror_as_income_expense:
          recurringForm.type === "transfer"
            ? Boolean(recurringForm.mirror_as_income_expense)
            : false,
        transfer_fee_amount:
          recurringForm.type === "transfer"
            ? parseAmountInput(recurringForm.transfer_fee_amount || "0")
            : 0,
        description: recurringForm.description.trim() || null,
        frequency: recurringForm.frequency,
        semi_monthly_day_1:
          recurringForm.type === "income" &&
          recurringForm.frequency === "semi_monthly"
            ? normalizedSemiMonthlyDays.day1
            : null,
        semi_monthly_day_2:
          recurringForm.type === "income" &&
          recurringForm.frequency === "semi_monthly"
            ? normalizedSemiMonthlyDays.day2
            : null,
        next_due_date: recurringForm.next_due_date,
      });
      setRecurringForm({
        type: recurringForm.type,
        amount: "",
        category: "",
        expense_category_id: "",
        income_category_id: "",
        from_account_id: "",
        to_account_id: "",
        mirror_as_income_expense: false,
        transfer_fee_amount: "",
        description: "",
        frequency: recurringForm.frequency,
        semi_monthly_day_1: "15",
        semi_monthly_day_2: "30",
        next_due_date: todayISO(),
      });
      setIsFormModalOpen(false);
      await refreshAll();
      return true;
    } catch (err) {
      setError(err.message || "Failed to add recurring item");
      return false;
    }
  };

  const handleConfirmRecurring = async (id) => {
    setError("");
    try {
      await api.confirmRecurringItem(id);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to confirm recurring item");
    }
  };

  const handleSkipRecurring = async (id) => {
    setError("");
    try {
      await api.skipRecurringItem(id);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to skip recurring item");
    }
  };

  const handleDeleteRecurring = async (id) => {
    setError("");
    try {
      await api.deleteRecurringItem(id);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to delete recurring item");
    }
  };

  const handleUpdateRecurring = async (id, payload) => {
    setError("");
    try {
      await api.updateRecurringItem(id, payload);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to update recurring item");
    }
  };

  const handleMarkExpenseRecurring = async (id) => {
    setError("");
    try {
      await api.markExpenseRecurring(id, { frequency: "monthly" });
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to mark expense as recurring");
    }
  };

  const handleSuggestionSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.saveExpenseSuggestion({
        category: suggestionForm.category.trim(),
        last_amount: parseAmountInput(suggestionForm.last_amount),
        expense_category_id:
          suggestionForm.expense_category_id === "" ||
          suggestionForm.expense_category_id === null ||
          suggestionForm.expense_category_id === undefined
            ? null
            : Number(suggestionForm.expense_category_id),
        selected_for_encoding: Boolean(suggestionForm.selected_for_encoding),
      });
      setSuggestionForm({
        category: "",
        last_amount: "",
        expense_category_id: "",
        selected_for_encoding: false,
      });
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to save suggestion");
    }
  };

  const handleSuggestionCreate = async (payload) => {
    setError("");
    try {
      const category =
        typeof payload?.category === "string" ? payload.category.trim() : "";
      if (!category) {
        throw new Error("Suggestion category is required.");
      }
      await api.saveExpenseSuggestion({
        category,
        last_amount: parseAmountInput(payload?.last_amount ?? 0),
        expense_category_id:
          payload?.expense_category_id === null ||
          payload?.expense_category_id === undefined ||
          payload?.expense_category_id === ""
            ? null
            : Number(payload.expense_category_id),
        selected_for_encoding: Boolean(payload?.selected_for_encoding),
      });
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to save suggestion");
      throw err;
    }
  };

  const handleSuggestionUpdate = async (originalCategory, next) => {
    setError("");
    try {
      if (
        originalCategory?.category !== next.category ||
        normalizeSuggestionCategoryId(originalCategory?.expense_category_id) !==
          normalizeSuggestionCategoryId(next?.expense_category_id)
      ) {
        await api.deleteExpenseSuggestion(
          originalCategory?.category,
          originalCategory?.expense_category_id
        );
      }
      await api.saveExpenseSuggestion({
        category: next.category,
        last_amount: parseAmountInput(next.last_amount),
        expense_category_id:
          next?.expense_category_id === null ||
          next?.expense_category_id === undefined ||
          next?.expense_category_id === ""
            ? null
            : Number(next.expense_category_id),
        selected_for_encoding: Boolean(next?.selected_for_encoding),
      });
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to update suggestion");
    }
  };

  const handleSuggestionDelete = async (category, expenseCategoryId) => {
    setError("");
    try {
      await api.deleteExpenseSuggestion(category, expenseCategoryId);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to delete suggestion");
    }
  };

  const handleCategorySubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.addCategory({ name: categoryForm.name.trim() });
      setCategoryForm({ name: "" });
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to add category");
    }
  };

  const handleCategoryCreate = async (payload) => {
    setError("");
    try {
      const name = typeof payload?.name === "string" ? payload.name.trim() : "";
      if (!name) {
        throw new Error("Expense category name is required.");
      }
      const nextPayload = { name };
      if (typeof payload?.color === "string" && payload.color.trim()) {
        nextPayload.color = payload.color.trim();
      }
      if (typeof payload?.icon === "string") {
        nextPayload.icon = payload.icon.trim();
      }
      await api.addCategory(nextPayload);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to add category");
      throw err;
    }
  };

  const handleCategoryUpdate = async (id, payload) => {
    setError("");
    try {
      const nextPayload =
        typeof payload === "string"
          ? { name: payload.trim() }
          : {
              ...(typeof payload?.name === "string"
                ? { name: payload.name.trim() }
                : {}),
              ...(typeof payload?.color === "string"
                ? { color: payload.color.trim() }
                : {}),
              ...(typeof payload?.icon === "string"
                ? { icon: payload.icon.trim() }
                : {}),
            };
      await api.updateCategory(id, nextPayload);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to update category");
    }
  };

  const handleCategoryDelete = async (id) => {
    setError("");
    try {
      await api.deleteCategory(id);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to delete category");
    }
  };

  const handleIncomeCategorySubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.addIncomeCategory({ name: incomeCategoryForm.name.trim() });
      setIncomeCategoryForm({ name: "" });
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to add income category");
    }
  };

  const handleIncomeCategoryCreate = async (payload) => {
    setError("");
    try {
      const name = typeof payload?.name === "string" ? payload.name.trim() : "";
      if (!name) {
        throw new Error("Income category name is required.");
      }
      const nextPayload = { name };
      if (typeof payload?.color === "string" && payload.color.trim()) {
        nextPayload.color = payload.color.trim();
      }
      if (typeof payload?.icon === "string") {
        nextPayload.icon = payload.icon.trim();
      }
      await api.addIncomeCategory(nextPayload);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to add income category");
      throw err;
    }
  };

  const handleIncomeCategoryRecordUpdate = async (id, payload) => {
    setError("");
    try {
      const nextPayload =
        typeof payload === "string"
          ? { name: payload.trim() }
          : {
              ...(typeof payload?.name === "string"
                ? { name: payload.name.trim() }
                : {}),
              ...(typeof payload?.color === "string"
                ? { color: payload.color.trim() }
                : {}),
              ...(typeof payload?.icon === "string"
                ? { icon: payload.icon.trim() }
                : {}),
            };
      await api.updateIncomeCategoryRecord(id, nextPayload);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to update income category");
    }
  };

  const handleIncomeCategoryDelete = async (id) => {
    setError("");
    try {
      await api.deleteIncomeCategory(id);
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to delete income category");
    }
  };

  const handleGenerateMonthlyReport = async (monthKey = null) => {
    setError("");
    try {
      const record = await api.generateMonthlyReport(monthKey || null, {
        entity_id: selectedEntityFilterId,
      });
      await refreshAll();
      if (record?.month_key) {
        setActiveView("reports");
        setReportsRouteMode("detail");
        setSelectedReportMonth(record.month_key);
        if (typeof window !== "undefined") {
          window.location.hash = `${REPORT_HASH_PREFIX}${record.month_key}`;
        }
      }
    } catch (err) {
      setError(err.message || "Failed to generate monthly report");
    }
  };

  const handleViewChange = (nextView) => {
    const normalizedView = normalizeAppView(nextView);
    setActiveView(normalizedView);
    if (normalizedView === "reports") {
      setReportsRouteMode("list");
      setSelectedReportMonth("");
      if (typeof window !== "undefined") {
        window.location.hash = "#/reports";
      }
      return;
    }
    setReportsRouteMode("list");
    if (typeof window !== "undefined") {
      window.location.hash = `#/${normalizedView}`;
    }
  };

  const handleOpenReportDetail = (monthKey) => {
    if (!isValidMonthKey(monthKey)) {
      return;
    }
    setActiveView("reports");
    setReportsRouteMode("detail");
    setSelectedReportMonth(monthKey);
    if (typeof window !== "undefined") {
      window.location.hash = `${REPORT_HASH_PREFIX}${monthKey}`;
    }
  };

  const handleBackToReportsList = () => {
    setActiveView("reports");
    setReportsRouteMode("list");
    setSelectedReportMonth("");
    setSelectedMonthlyReport(null);
    if (typeof window !== "undefined") {
      window.location.hash = "#/reports";
    }
  };

  const tabs = [
    { id: "balance", label: "Home" },
    { id: "projections", label: "Projections" },
    { id: "budgeting", label: "Budgeting" },
    { id: "reports", label: "Reports" },
    { id: "transactions", label: "Transactions" },
    {
      id: "recurring",
      label: "Recurring",
      badge: pendingRecurringItems.length,
    },
    {
      id: "insurance",
      label: "Insurance",
      badge: pendingLifeInsuranceItems.length,
    },
    { id: "config", label: "Config" },
  ];

  const modalButtonLabels = {};
  const supportsModalForm = Object.prototype.hasOwnProperty.call(
    modalButtonLabels,
    activeView
  );
  const showDashboardSidebar = activeView === "balance";
  const showInlineLeftPanel = false;

  const sharedLeftPanelProps = {
    activeView,
    compactMode: isCompactLayout,
    currency,
    currencyOptions: CURRENCY_OPTIONS,
    onCurrencyChange: (event) => setCurrency(event.target.value),
    onCurrencySubmit: handleCurrencySubmit,
    incomeForm,
    onIncomeFormChange: handleIncomeFormChange,
    onIncomeSubmit: handleIncomeSubmit,
    incomeAccountOptions,
    defaultIncomeAccountOption,
    incomeCategoryOptions: incomeCategoryRecords,
    expenseMonth,
    expenseMonths,
    onExpenseMonthChange: (event) => setExpenseMonth(event.target.value),
    expenseForm,
    onExpenseFormChange: handleExpenseFormChange,
    onExpenseSubmit: handleExpenseSubmit,
    expenseAccountOptions,
    defaultExpenseAccountOption,
    categoryOptions: allNameOptions,
    expenseNameOptions,
    expenseCategoryOptions: categoryRecords,
    entities,
    accounts: allAccounts,
    activeEntityFilterId: selectedEntityFilterId,
    recurringItems,
    pendingRecurringItems,
    recurringForm,
    onRecurringFormChange: handleRecurringFormChange,
    onRecurringSubmit: handleRecurringSubmit,
    onConfirmRecurring: handleConfirmRecurring,
    onSkipRecurring: handleSkipRecurring,
    onDeleteRecurring: handleDeleteRecurring,
    debtForm,
    onDebtFormChange: handleDebtFormChange,
    onDebtSubmit: handleDebtSubmit,
    onDebtCsvImport: handleDebtCsvImport,
    debtCategoryOptions: categoryRecords,
    onDebtNameChange: handleDebtNameChange,
    debtOrigins,
    loanOriginOptions,
    onDebtOriginSelect: handleDebtOriginSelect,
    onDebtOriginSuggestionSelect: handleDebtOriginSuggestionSelect,
    suggestions: categories,
    onCategoryChange: handleNameChange,
    onSuggestionSelect: applyExpenseSuggestionToForm,
    formatMoney,
    formatAmountInput,
    suggestionForm,
    onSuggestionFormChange: handleSuggestionFormChange,
    onSuggestionSubmit: handleSuggestionSubmit,
    categoryForm,
    onCategoryFormChange: handleCategoryFormChange,
    onCategorySubmit: handleCategorySubmit,
    incomeCategoryForm,
    onIncomeCategoryFormChange: handleIncomeCategoryFormChange,
    onIncomeCategorySubmit: handleIncomeCategorySubmit,
  };

  const homeSidebarProps = {
    balance,
    dashboardCurrentBalance,
    dashboardCurrentBalanceSummary,
    dashboardBalanceAccountName,
    isAllEntitiesSelected,
    safeToSpendAmount,
    bufferMonths,
    upcomingRecurringIncomeTotal,
    daysBeforeNextIncome,
    thirtyDayProjectionSeries,
    sixMonthProjectionSeries,
    dailyTrendSeries,
    monthlyTrendSeries,
    averageExpensePerMonth,
    averageDebtPerMonth,
    averageIncomePerMonth,
    expenseCategoryBreakdown,
    categoryRecords,
    balanceTopRecentDebtCategories,
    balanceTopRecentDebtCategoriesTotal,
    topRecentDebtPeriodLabel,
    formatMoney,
    formatDashboardMoney,
    formatCurrencySummary,
  };

  const homeMainProps = {
    currentBalanceAmount,
    dailyBalanceTrendSeries,
    dailyTrendSeries,
    monthlyBalanceTrendSeries,
    monthlyTrendSeries,
    thirtyDayProjectionSeries,
    sixMonthProjectionSeries,
    balanceMonths,
    balanceMonth,
    onBalanceMonthChange: (event) => setBalanceMonth(event.target.value),
    balanceMonthIncomeTotal,
    balanceMonthSavings,
    expenseBreakdownTotal,
    balanceDebtAccumulated,
    balanceDebtPaid,
    balanceDebtTotal,
    formatMoney,
  };

  const accountsViewProps = {
    formatMoney,
    selectedEntityId,
    onSelectedEntityIdChange: setSelectedEntityId,
    onEntitiesChange: syncEntities,
    institutions,
    expenseCategoryOptions: categoryRecords,
    incomeCategoryOptions: incomeCategoryRecords,
    currency,
    currencyOptions: CURRENCY_OPTIONS,
  };

  const projectionsViewProps = {
    formatMoneyForCurrency,
    entities,
    activeEntityFilterId: selectedEntityFilterId,
    expenseCategoryOptions: categoryRecords,
    incomeCategoryOptions: incomeCategoryRecords,
  };

  const rightPanelProps = {
    activeView,
    balance,
    monthlyReports,
    reportsRouteMode,
    selectedReportMonth,
    onOpenReportDetail: handleOpenReportDetail,
    onBackToReportsList: handleBackToReportsList,
    selectedMonthlyReport,
    isMonthlyReportLoading,
    onGenerateMonthlyReport: handleGenerateMonthlyReport,
    formatMoney,
    expenseCategoryBreakdown,
    expenseBreakdownTotal,
    balanceDebtRecords,
    debtCategoryBreakdown,
    debtCategoryBreakdownTotal,
    incomeTotal,
    filteredIncome,
    incomeForm,
    onIncomeFormChange: handleIncomeFormChange,
    onIncomeSubmit: handleIncomeSubmit,
    incomeAccountOptions,
    defaultIncomeAccountOption,
    onUpdateIncome: handleUpdateIncome,
    onDeleteIncome: handleDeleteIncome,
    onIncomeCategoryUpdate: handleIncomeCategoryUpdate,
    incomeCategoryOptions: incomeCategoryRecords,
    incomeMonth,
    incomeMonths,
    onIncomeMonthChange: (event) => setIncomeMonth(event.target.value),
    incomeCategoryFilter,
    onIncomeCategoryFilterChange: (event) =>
      setIncomeCategoryFilter(event.target.value),
    expenseTotal,
    expenseForm,
    onExpenseFormChange: handleExpenseFormChange,
    onExpenseSubmit: handleExpenseSubmit,
    expenseAccountOptions,
    defaultExpenseAccountOption,
    onUpdateExpense: handleUpdateExpense,
    entities,
    accounts: allAccounts,
    activeEntityFilterId: selectedEntityFilterId,
    recurringItems,
    pendingRecurringItems,
    recurringForm,
    onRecurringFormChange: handleRecurringFormChange,
    onRecurringSubmit: handleRecurringSubmit,
    onConfirmRecurring: handleConfirmRecurring,
    onSkipRecurring: handleSkipRecurring,
    onUpdateRecurring: handleUpdateRecurring,
    onDeleteRecurring: handleDeleteRecurring,
    sortedExpenses,
    expenseSort,
    onToggleExpenseSort: toggleExpenseSort,
    onDeleteExpense: handleDeleteExpense,
    onMarkExpenseRecurring: handleMarkExpenseRecurring,
    onExpenseCategoryUpdate: handleExpenseCategoryUpdate,
    onExpenseExpectationUpdate: handleExpenseExpectationUpdate,
    expenseCategoryOptions: categoryRecords,
    expenseMonth,
    expenseMonths,
    onExpenseMonthChange: (event) => setExpenseMonth(event.target.value),
    expenseCategoryFilter,
    onExpenseCategoryFilterChange: (event) =>
      setExpenseCategoryFilter(event.target.value),
    expenseDateFrom,
    onExpenseDateFromChange: (event) => setExpenseDateFrom(event.target.value),
    expenseDateTo,
    onExpenseDateToChange: (event) => setExpenseDateTo(event.target.value),
    debtMonth,
    debtMonths,
    onDebtMonthChange: (event) => setDebtMonth(event.target.value),
    debtCategoryFilter,
    onDebtCategoryFilterChange: (event) =>
      setDebtCategoryFilter(event.target.value),
    debtTotal,
    debtCycleMonth: debtMonth,
    debtStatementCycleTotals,
    sortedDebts,
    debtSort,
    onToggleDebtSort: toggleDebtSort,
    debtForm,
    onDebtFormChange: handleDebtFormChange,
    onDebtSubmit: handleDebtSubmit,
    onUpdateDebt: handleUpdateDebt,
    onDebtCsvImport: handleDebtCsvImport,
    selectedDebtIds,
    onDebtRowSelectionChange: handleDebtRowSelectionChange,
    onDebtSelectAllChange: handleDebtSelectAllChange,
    onDeleteSelectedDebts: handleDeleteSelectedDebts,
    onDeleteDebt: handleDeleteDebt,
    onPayoffLoanOrigin: handlePayoffLoanOrigin,
    onDebtCategoryUpdate: handleDebtCategoryUpdate,
    debtCategoryOptions: categoryRecords,
    debtOrigins,
    loanOriginOptions,
    onDebtOriginSuggestionSelect: handleDebtOriginSuggestionSelect,
    loanOriginConfigs,
    onLoanOriginConfigSave: handleLoanOriginConfigSave,
    onLoanOriginConfigDelete: handleLoanOriginConfigDelete,
    institutions,
    lifeInsurances,
    budgets,
    onInstitutionSave: handleInstitutionSave,
    onInstitutionDelete: handleInstitutionDelete,
    onCreateLifeInsurance: handleCreateLifeInsurance,
    onUpdateLifeInsurance: handleUpdateLifeInsurance,
    onDeleteLifeInsurance: handleDeleteLifeInsurance,
    onCreateBudget: handleCreateBudget,
    onUpdateBudget: handleUpdateBudget,
    onDeleteBudget: handleDeleteBudget,
    suggestions: categories,
    categoryRecords,
    onCategoryCreate: handleCategoryCreate,
    onCategoryUpdate: handleCategoryUpdate,
    onCategoryDelete: handleCategoryDelete,
    incomeCategoryRecords,
    onIncomeCategoryCreate: handleIncomeCategoryCreate,
    onIncomeCategoryRecordUpdate: handleIncomeCategoryRecordUpdate,
    onIncomeCategoryDelete: handleIncomeCategoryDelete,
    onSuggestionCreate: handleSuggestionCreate,
    onSuggestionUpdate: handleSuggestionUpdate,
    onSuggestionDelete: handleSuggestionDelete,
    currency,
    currencyOptions: CURRENCY_OPTIONS,
    onCurrencyChange: (event) => setCurrency(event.target.value),
    onCurrencySubmit: handleCurrencySubmit,
    formatAmountInput,
  };

  return (
    <div className="app">
      {notice && <Banner tone="success">{notice}</Banner>}
      {error && <Banner tone="error">{error}</Banner>}

      <TabBar
        tabs={tabs}
        activeView={activeView}
        onChange={handleViewChange}
        compact={isCompactLayout}
        entityOptions={entities}
        selectedEntityId={selectedEntityId}
        onEntityChange={setSelectedEntityId}
      />
      <AppLayoutContent
        activeView={activeView}
        isCompactLayout={isCompactLayout}
        supportsModalForm={supportsModalForm}
        isFormModalOpen={isFormModalOpen}
        modalButtonLabel={modalButtonLabels[activeView]}
        showDashboardSidebar={showDashboardSidebar}
        showInlineLeftPanel={showInlineLeftPanel}
        leftPanelProps={sharedLeftPanelProps}
        homeSidebarProps={homeSidebarProps}
        homeMainProps={homeMainProps}
        accountsViewProps={accountsViewProps}
        projectionsViewProps={projectionsViewProps}
        rightPanelProps={rightPanelProps}
        onOpenFormModal={() => setIsFormModalOpen(true)}
        onCloseFormModal={() => setIsFormModalOpen(false)}
      />
    </div>
  );
}
