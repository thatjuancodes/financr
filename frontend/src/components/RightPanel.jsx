import React from "react";
import { api } from "../api";
import { monthLabel } from "../utils/format";
import {
  normalizeRecurringDayInput,
  normalizeSemiMonthlyDays,
  recurringFrequencyLabel,
  recurringFrequencyOptionsForType,
  recurringAccountOptionLabel,
  getRecurringTransferDirection,
  getRecurringTransferName,
  getRecurringTransferCategoryLabel,
  buildRecurringTransferDestinationAccounts,
  isCrossEntityRecurringTransfer,
  calculateRecurringRateTotals,
  calculateRecurringPerspectiveTotals,
} from "../utils/recurring";
import {
  normalizeExpenseExpectation,
  expenseExpectationLabel,
  statementLabel,
  getDueDateForStatementMonth,
  diffDaysFromToday,
  formatRemainingDaysLabel,
  normalizeMoneyValue,
  normalizeSuggestionCategoryId,
  suggestionKey,
  isSuggestionSelectedForEncoding,
  formatPercent,
  buildPieSlicePaths,
} from "../utils/rightPanel";
import { createRightPanelConfigActions } from "../utils/rightPanelConfigActions";
import { createRightPanelAdminActions } from "../utils/rightPanelAdminActions";
import { createRightPanelDebtActions } from "../utils/rightPanelDebtActions";
import { createRightPanelRecordActions } from "../utils/rightPanelRecordActions";
import {
  CATEGORY_COLOR_SWATCHES,
  buildCategoryBadgeStyle,
  resolveCategoryColor,
} from "../utils/categoryColors";
import useRecordDrawerState from "../hooks/useRecordDrawerState";
import useRightPanelUiResets from "../hooks/useRightPanelUiResets";
import RecurringTypeTable from "./RecurringTypeTable";
import RightPanelConfigView from "./RightPanelConfigView";
import RightPanelBalanceView from "./RightPanelBalanceView";
import RightPanelDebtView from "./RightPanelDebtView";
import RightPanelExpensesView from "./RightPanelExpensesView";
import RightPanelBudgetView from "./RightPanelBudgetView";
import RightPanelIncomeView from "./RightPanelIncomeView";
import RightPanelInsuranceView from "./RightPanelInsuranceView";
import RightPanelReportsView from "./RightPanelReportsView";
import RightPanelRecurringView from "./RightPanelRecurringView";
import RightPanelTransactionsView from "./RightPanelTransactionsView";
import Button from "./ui/Button";
const EXPENSE_EXPECTATION_OPTIONS = [
  { value: "unexpected", label: "Unexpected" },
  { value: "expected", label: "Expected" },
];
const INSTITUTION_CURRENCY_OPTIONS = [
  "PHP",
  "USD",
  "VND",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
];

export default function RightPanel({
  activeView,
  balance,
  monthlyReports = [],
  reportsRouteMode = "list",
  selectedReportMonth = "",
  onOpenReportDetail,
  onBackToReportsList,
  selectedMonthlyReport = null,
  isMonthlyReportLoading = false,
  onGenerateMonthlyReport,
  formatMoney,
  expenseCategoryBreakdown,
  expenseBreakdownTotal,
  balanceDebtRecords = [],
  debtCategoryBreakdown = [],
  debtCategoryBreakdownTotal = 0,
  incomeTotal,
  filteredIncome,
  incomeForm,
  onIncomeFormChange,
  onIncomeSubmit,
  incomeAccountOptions = [],
  defaultIncomeAccountOption = null,
  onUpdateIncome,
  onDeleteIncome,
  onIncomeCategoryUpdate,
  incomeCategoryOptions = [],
  expenseTotal,
  expenseForm,
  onExpenseFormChange,
  onExpenseSubmit,
  expenseAccountOptions = [],
  defaultExpenseAccountOption = null,
  onUpdateExpense,
  entities = [],
  accounts = [],
  activeEntityFilterId = undefined,
  recurringItems,
  pendingRecurringItems = [],
  recurringForm,
  onRecurringFormChange,
  onRecurringSubmit,
  onConfirmRecurring,
  onSkipRecurring,
  onUpdateRecurring,
  onDeleteRecurring,
  sortedExpenses,
  expenseSort,
  onToggleExpenseSort,
  onDeleteExpense,
  onMarkExpenseRecurring,
  onExpenseCategoryUpdate,
  onExpenseExpectationUpdate,
  expenseCategoryOptions,
  incomeMonth,
  incomeMonths,
  onIncomeMonthChange,
  incomeCategoryFilter,
  onIncomeCategoryFilterChange,
  expenseMonth,
  expenseMonths,
  onExpenseMonthChange,
  expenseCategoryFilter,
  onExpenseCategoryFilterChange,
  expenseDateFrom = "",
  onExpenseDateFromChange,
  expenseDateTo = "",
  onExpenseDateToChange,
  debtMonth,
  debtMonths,
  onDebtMonthChange,
  debtCategoryFilter,
  onDebtCategoryFilterChange,
  debtTotal,
  debtCycleMonth,
  debtStatementCycleTotals = [],
  sortedDebts,
  debtSort,
  onToggleDebtSort,
  debtForm,
  onDebtFormChange,
  onDebtSubmit,
  onUpdateDebt,
  onDebtCsvImport,
  selectedDebtIds = [],
  onDebtRowSelectionChange,
  onDebtSelectAllChange,
  onDeleteSelectedDebts,
  onDeleteDebt,
  onPayoffLoanOrigin,
  onDebtCategoryUpdate,
  debtCategoryOptions,
  debtOrigins = [],
  loanOriginOptions = [],
  onDebtOriginSuggestionSelect,
  loanOriginConfigs = [],
  onLoanOriginConfigSave,
  onLoanOriginConfigDelete,
  institutions = [],
  lifeInsurances = [],
  budgets = [],
  onInstitutionSave,
  onInstitutionDelete,
  onCreateLifeInsurance,
  onUpdateLifeInsurance,
  onDeleteLifeInsurance,
  onCreateBudget,
  onUpdateBudget,
  onDeleteBudget,
  suggestions,
  categoryRecords,
  incomeCategoryRecords = [],
  onCategoryCreate,
  onCategoryUpdate,
  onCategoryDelete,
  onIncomeCategoryCreate,
  onIncomeCategoryRecordUpdate,
  onIncomeCategoryDelete,
  onSuggestionCreate,
  onSuggestionUpdate,
  onSuggestionDelete,
  currency = "PHP",
  currencyOptions = INSTITUTION_CURRENCY_OPTIONS,
  onCurrencyChange,
  onCurrencySubmit,
  formatAmountInput,
  accountsViewProps,
}) {
  const [configTab, setConfigTab] = React.useState("general");
  const [breakdownView, setBreakdownView] = React.useState("table");
  const [debtBreakdownView, setDebtBreakdownView] = React.useState("table");
  const [hoveredCategory, setHoveredCategory] = React.useState(null);
  const [hoveredDebtOrigin, setHoveredDebtOrigin] = React.useState(null);
  const [activeBankConfigId, setActiveBankConfigId] = React.useState(null);
  const [isAddBankDrawerOpen, setIsAddBankDrawerOpen] = React.useState(false);
  const [bankDrawerError, setBankDrawerError] = React.useState("");
  const [isBankDrawerSubmitting, setIsBankDrawerSubmitting] =
    React.useState(false);
  const [addCategoryDraft, setAddCategoryDraft] = React.useState({
    name: "",
    color: CATEGORY_COLOR_SWATCHES[0] ?? "",
  });
  const [addIncomeCategoryDraft, setAddIncomeCategoryDraft] = React.useState({
    name: "",
    color: CATEGORY_COLOR_SWATCHES[0] ?? "",
  });
  const [addSuggestionDraft, setAddSuggestionDraft] = React.useState({
    category: "",
    last_amount: "",
    expense_category_id: "",
    selected_for_encoding: false,
  });
  const [isImportDebtDrawerOpen, setIsImportDebtDrawerOpen] =
    React.useState(false);
  const [debtCsvText, setDebtCsvText] = React.useState("");
  const [debtCsvFileName, setDebtCsvFileName] = React.useState("");
  const [debtCsvDefaultLoanOrigin, setDebtCsvDefaultLoanOrigin] =
    React.useState("");
  const [debtCsvDefaultCategoryId, setDebtCsvDefaultCategoryId] =
    React.useState("");
  const [debtCsvImportError, setDebtCsvImportError] = React.useState("");
  const [isDebtCsvImporting, setIsDebtCsvImporting] = React.useState(false);
  const [recurringFrequencyFilter, setRecurringFrequencyFilter] =
    React.useState("all");
  const [recurringExpenseCategoryFilter, setRecurringExpenseCategoryFilter] =
    React.useState("all");
  const [activeLoanOriginConfigId, setActiveLoanOriginConfigId] =
    React.useState(null);
  const [isAddLoanOriginDrawerOpen, setIsAddLoanOriginDrawerOpen] =
    React.useState(false);
  const [loanOriginDrawerError, setLoanOriginDrawerError] = React.useState("");
  const [isLoanOriginDrawerSubmitting, setIsLoanOriginDrawerSubmitting] =
    React.useState(false);
  const [loanOriginConfigDrafts, setLoanOriginConfigDrafts] = React.useState({});
  const [bankConfigDrafts, setBankConfigDrafts] = React.useState({});
  const [newBankConfigForm, setNewBankConfigForm] = React.useState({
    name: "",
    type: "bank",
    code: "",
    swift_code: "",
    currency_code: currency,
    is_active: true,
  });
  const [newLoanOriginForm, setNewLoanOriginForm] = React.useState({
    loan_origin: "",
    statement_day: "",
    due_day: "",
  });
  const [expandedDebtGroups, setExpandedDebtGroups] = React.useState({});
  const [debtBulkAction, setDebtBulkAction] = React.useState("");
  const [debtPayoffModal, setDebtPayoffModal] = React.useState(null);
  const [debtPayoffForm, setDebtPayoffForm] = React.useState({
    payment_date: "",
    amount: "",
  });
  const [debtPayoffError, setDebtPayoffError] = React.useState("");
  const [isDebtPayoffSubmitting, setIsDebtPayoffSubmitting] =
    React.useState(false);
  const [exportingDataset, setExportingDataset] = React.useState("");
  const [dataExportError, setDataExportError] = React.useState("");
  const getTodayIsoLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const buildIncomeDraft = React.useCallback(
    (item) => ({
      amount: formatAmountInput(String(item.amount ?? "")),
      source: item.source ?? "",
      received_date: item.received_date ?? "",
      income_category_id:
        item.income_category_id === null || item.income_category_id === undefined
          ? ""
          : String(item.income_category_id),
    }),
    [formatAmountInput]
  );
  const buildExpenseDraftState = React.useCallback(
    (item) => ({
      amount: formatAmountInput(String(item.amount ?? "")),
      name: item.name ?? "",
      notes: item.notes ?? "",
      spent_at: item.spent_at ?? "",
      from_account_id:
        item.from_account_id === null || item.from_account_id === undefined
          ? ""
          : String(item.from_account_id),
      expense_expectation: normalizeExpenseExpectation(item.expense_expectation),
      expense_category_id:
        item.expense_category_id === null || item.expense_category_id === undefined
          ? ""
          : String(item.expense_category_id),
    }),
    [formatAmountInput]
  );
  const {
    drafts: incomeDrafts,
    activeId: activeIncomeId,
    setActiveId: setActiveIncomeId,
    activeItem: activeIncomeItem,
    activeDraft: activeIncomeDraft,
    drawerError: incomeDrawerError,
    setDrawerError: setIncomeDrawerError,
    isDrawerSubmitting: isIncomeDrawerSubmitting,
    setIsDrawerSubmitting: setIsIncomeDrawerSubmitting,
    isAddDrawerOpen: isAddIncomeDrawerOpen,
    setIsAddDrawerOpen: setIsAddIncomeDrawerOpen,
    addDrawerError: addIncomeDrawerError,
    setAddDrawerError: setAddIncomeDrawerError,
    isAddDrawerSubmitting: isAddIncomeDrawerSubmitting,
    setIsAddDrawerSubmitting: setIsAddIncomeDrawerSubmitting,
    updateDraft: updateIncomeDraft,
    openDrawer: openIncomeDrawer,
    closeDrawer: closeIncomeDrawer,
    openAddDrawer: openAddIncomeDrawer,
    closeAddDrawer: closeAddIncomeDrawer,
    handleRowKeyDown: handleIncomeRowKeyDown,
  } = useRecordDrawerState({
    items: filteredIncome,
    toDraft: buildIncomeDraft,
    formatFieldValue: (field, value) =>
      field === "amount" ? formatAmountInput(value) : value,
  });
  const {
    drafts: expenseDrafts,
    activeId: activeExpenseId,
    setActiveId: setActiveExpenseId,
    activeItem: activeExpenseItem,
    activeDraft: activeExpenseDraft,
    drawerError: expenseDrawerError,
    setDrawerError: setExpenseDrawerError,
    isDrawerSubmitting: isExpenseDrawerSubmitting,
    setIsDrawerSubmitting: setIsExpenseDrawerSubmitting,
    isAddDrawerOpen: isAddExpenseDrawerOpen,
    setIsAddDrawerOpen: setIsAddExpenseDrawerOpen,
    addDrawerError: addExpenseDrawerError,
    setAddDrawerError: setAddExpenseDrawerError,
    isAddDrawerSubmitting: isAddExpenseDrawerSubmitting,
    setIsAddDrawerSubmitting: setIsAddExpenseDrawerSubmitting,
    updateDraft: updateExpenseDraft,
    openDrawer: openExpenseDrawer,
    closeDrawer: closeExpenseDrawer,
    openAddDrawer: openAddExpenseDrawer,
    closeAddDrawer: closeAddExpenseDrawer,
    handleRowKeyDown: handleExpenseRowKeyDown,
  } = useRecordDrawerState({
    items: sortedExpenses,
    toDraft: buildExpenseDraftState,
    formatFieldValue: (field, value) =>
      field === "amount" ? formatAmountInput(value) : value,
  });
  const buildDebtDraftState = React.useCallback(
    (item) => ({
      amount: formatAmountInput(String(item.amount ?? "")),
      name: item.name ?? "",
      loan_origin: item.loan_origin ?? "",
      notes: item.notes ?? "",
      spent_at: item.spent_at ?? "",
      debt_category_id:
        item.debt_category_id === null || item.debt_category_id === undefined
          ? ""
          : String(item.debt_category_id),
    }),
    [formatAmountInput]
  );
  const {
    drafts: debtDrafts,
    activeId: activeDebtId,
    setActiveId: setActiveDebtId,
    activeItem: activeDebtItem,
    activeDraft: activeDebtDraft,
    drawerError: debtDrawerError,
    setDrawerError: setDebtDrawerError,
    isDrawerSubmitting: isDebtDrawerSubmitting,
    setIsDrawerSubmitting: setIsDebtDrawerSubmitting,
    isAddDrawerOpen: isAddDebtDrawerOpen,
    setIsAddDrawerOpen: setIsAddDebtDrawerOpen,
    addDrawerError: addDebtDrawerError,
    setAddDrawerError: setAddDebtDrawerError,
    isAddDrawerSubmitting: isAddDebtDrawerSubmitting,
    setIsAddDrawerSubmitting: setIsAddDebtDrawerSubmitting,
    updateDraft: updateDebtDraft,
    openDrawer: baseOpenDebtDrawer,
    closeDrawer: baseCloseDebtDrawer,
    openAddDrawer: baseOpenAddDebtDrawer,
    closeAddDrawer: baseCloseAddDebtDrawer,
  } = useRecordDrawerState({
    items: sortedDebts,
    toDraft: buildDebtDraftState,
    formatFieldValue: (field, value) =>
      field === "amount" ? formatAmountInput(value) : value,
  });
  const recurringAccountMap = React.useMemo(() => {
    return new Map((Array.isArray(accounts) ? accounts : []).map((item) => [String(item.id), item]));
  }, [accounts]);
  const addRecurringSourceAccounts = React.useMemo(() => {
    return Array.isArray(accounts) ? accounts : [];
  }, [accounts]);
  const addRecurringSourceAccount = React.useMemo(() => {
    return recurringAccountMap.get(String(recurringForm?.from_account_id || "")) || null;
  }, [recurringAccountMap, recurringForm?.from_account_id]);
  const addRecurringDestinationAccount = React.useMemo(() => {
    return recurringAccountMap.get(String(recurringForm?.to_account_id || "")) || null;
  }, [recurringAccountMap, recurringForm?.to_account_id]);
  const addRecurringDestinationAccounts = React.useMemo(() => {
    return buildRecurringTransferDestinationAccounts(accounts, addRecurringSourceAccount);
  }, [accounts, addRecurringSourceAccount]);
  const isAddRecurringTransferCrossEntity = isCrossEntityRecurringTransfer(
    addRecurringSourceAccount,
    addRecurringDestinationAccount
  );
  const filteredRecurringItems = React.useMemo(() => {
    if (recurringFrequencyFilter === "all") {
      return recurringItems;
    }
    return recurringItems.filter((item) => item.frequency === recurringFrequencyFilter);
  }, [recurringItems, recurringFrequencyFilter]);
  const filteredRecurringExpenses = React.useMemo(
    () => filteredRecurringItems.filter((item) => item.type === "expense"),
    [filteredRecurringItems]
  );
  const filteredRecurringExpensesByCategory = React.useMemo(() => {
    if (recurringExpenseCategoryFilter === "all") {
      return filteredRecurringExpenses;
    }
    if (recurringExpenseCategoryFilter === "uncategorized") {
      return filteredRecurringExpenses.filter(
        (item) =>
          item.expense_category_id === null || item.expense_category_id === undefined
      );
    }
    return filteredRecurringExpenses.filter(
      (item) => String(item.expense_category_id ?? "") === recurringExpenseCategoryFilter
    );
  }, [filteredRecurringExpenses, recurringExpenseCategoryFilter]);
  const filteredRecurringExpenseTotals = React.useMemo(
    () => calculateRecurringRateTotals(filteredRecurringExpensesByCategory),
    [filteredRecurringExpensesByCategory]
  );
  const filteredRecurringIncome = React.useMemo(
    () => filteredRecurringItems.filter((item) => item.type === "income"),
    [filteredRecurringItems]
  );
  const filteredRecurringTransfers = React.useMemo(
    () => filteredRecurringItems.filter((item) => item.type === "transfer"),
    [filteredRecurringItems]
  );
  const recurringTransferPerspectiveTotals = React.useMemo(
    () => calculateRecurringPerspectiveTotals(recurringItems, activeEntityFilterId),
    [recurringItems, activeEntityFilterId]
  );
  const recurringExpenseBreakdownTotals = React.useMemo(
    () => {
      const baseTotals = calculateRecurringRateTotals(
        recurringItems.filter((item) => item.type === "expense")
      );
      return {
        weekly: normalizeMoneyValue(
          baseTotals.weekly + recurringTransferPerspectiveTotals.expense.weekly
        ),
        monthly: normalizeMoneyValue(
          baseTotals.monthly + recurringTransferPerspectiveTotals.expense.monthly
        ),
      };
    },
    [recurringItems, recurringTransferPerspectiveTotals]
  );
  const recurringIncomeBreakdownTotals = React.useMemo(
    () => {
      const baseTotals = calculateRecurringRateTotals(
        recurringItems.filter((item) => item.type === "income")
      );
      return {
        weekly: normalizeMoneyValue(
          baseTotals.weekly + recurringTransferPerspectiveTotals.income.weekly
        ),
        monthly: normalizeMoneyValue(
          baseTotals.monthly + recurringTransferPerspectiveTotals.income.monthly
        ),
      };
    },
    [recurringItems, recurringTransferPerspectiveTotals]
  );
  const recurringSpendingPowerMonthly = React.useMemo(
    () =>
      normalizeMoneyValue(
        recurringIncomeBreakdownTotals.monthly -
          recurringExpenseBreakdownTotals.monthly
      ),
    [recurringIncomeBreakdownTotals, recurringExpenseBreakdownTotals]
  );
  const recurringSpendingPowerWeekly = React.useMemo(
    () =>
      normalizeMoneyValue(
        recurringIncomeBreakdownTotals.weekly -
          recurringExpenseBreakdownTotals.weekly
      ),
    [recurringIncomeBreakdownTotals, recurringExpenseBreakdownTotals]
  );
  const buildRecurringDraftState = React.useCallback(
    (item) => {
      const normalizedDays = normalizeSemiMonthlyDays(
        item.semi_monthly_day_1,
        item.semi_monthly_day_2
      );
      return {
        type: item.type,
        amount: formatAmountInput(String(item.amount ?? "")),
        category: item.category ?? "",
        expense_category_id:
          item.expense_category_id === null || item.expense_category_id === undefined
            ? ""
            : String(item.expense_category_id),
        income_category_id:
          item.income_category_id === null || item.income_category_id === undefined
            ? ""
            : String(item.income_category_id),
        from_account_id:
          item.from_account_id === null || item.from_account_id === undefined
            ? ""
            : String(item.from_account_id),
        to_account_id:
          item.to_account_id === null || item.to_account_id === undefined
            ? ""
            : String(item.to_account_id),
        mirror_as_income_expense: Boolean(item.mirror_as_income_expense),
        transfer_fee_amount: formatAmountInput(String(item.transfer_fee_amount ?? "")),
        description: item.description ?? "",
        frequency: item.frequency,
        semi_monthly_day_1: normalizedDays.valid ? String(normalizedDays.day1) : "15",
        semi_monthly_day_2: normalizedDays.valid ? String(normalizedDays.day2) : "30",
        next_due_date: item.next_due_date ?? "",
      };
    },
    [formatAmountInput]
  );
  const {
    drafts: recurringDrafts,
    activeId: activeRecurringItemId,
    setActiveId: setActiveRecurringItemId,
    activeItem: activeRecurringItem,
    activeDraft: activeRecurringDraft,
    drawerError: recurringDrawerError,
    setDrawerError: setRecurringDrawerError,
    isDrawerSubmitting: isRecurringDrawerSubmitting,
    setIsDrawerSubmitting: setIsRecurringDrawerSubmitting,
    isAddDrawerOpen: isAddRecurringDrawerOpen,
    setIsAddDrawerOpen: setIsAddRecurringDrawerOpen,
    addDrawerError: addRecurringDrawerError,
    setAddDrawerError: setAddRecurringDrawerError,
    isAddDrawerSubmitting: isAddRecurringDrawerSubmitting,
    setIsAddDrawerSubmitting: setIsAddRecurringDrawerSubmitting,
    updateDraft: updateRecurringDraft,
    openDrawer: openRecurringDrawer,
    closeDrawer: closeRecurringDrawer,
    openAddDrawer: openAddRecurringDrawer,
    closeAddDrawer: closeAddRecurringDrawer,
    handleRowKeyDown: handleRecurringRowKeyDown,
  } = useRecordDrawerState({
    items: recurringItems,
    visibleItems: filteredRecurringItems,
    toDraft: buildRecurringDraftState,
    formatFieldValue: (field, value) =>
      field === "amount"
        ? formatAmountInput(value)
        : field === "semi_monthly_day_1" || field === "semi_monthly_day_2"
          ? normalizeRecurringDayInput(value)
          : value,
  });
  const activeRecurringSourceAccounts = React.useMemo(() => {
    return Array.isArray(accounts) ? accounts : [];
  }, [accounts]);
  const activeRecurringSourceAccount = React.useMemo(() => {
    const sourceAccountId =
      activeRecurringDraft?.from_account_id ??
      (activeRecurringItem?.from_account_id === null || activeRecurringItem?.from_account_id === undefined
        ? ""
        : String(activeRecurringItem.from_account_id));
    return recurringAccountMap.get(String(sourceAccountId || "")) || null;
  }, [activeRecurringDraft, activeRecurringItem, recurringAccountMap]);
  const activeRecurringDestinationAccount = React.useMemo(() => {
    const destinationAccountId =
      activeRecurringDraft?.to_account_id ??
      (activeRecurringItem?.to_account_id === null || activeRecurringItem?.to_account_id === undefined
        ? ""
        : String(activeRecurringItem.to_account_id));
    return recurringAccountMap.get(String(destinationAccountId || "")) || null;
  }, [activeRecurringDraft, activeRecurringItem, recurringAccountMap]);
  const activeRecurringDestinationAccounts = React.useMemo(() => {
    return buildRecurringTransferDestinationAccounts(accounts, activeRecurringSourceAccount);
  }, [accounts, activeRecurringSourceAccount]);
  const isActiveRecurringTransferCrossEntity = isCrossEntityRecurringTransfer(
    activeRecurringSourceAccount,
    activeRecurringDestinationAccount
  );
  const buildCategoryDraftState = React.useCallback(
    (item) => ({
      name: item.name ?? "",
      color: resolveCategoryColor(item.color, `${item.id}:${item.name ?? ""}`),
    }),
    []
  );
  const {
    activeId: activeCategoryId,
    setActiveId: setActiveCategoryId,
    activeItem: activeCategoryItem,
    activeDraft: activeCategoryDraft,
    drawerError: categoryDrawerError,
    setDrawerError: setCategoryDrawerError,
    isDrawerSubmitting: isCategoryDrawerSubmitting,
    setIsDrawerSubmitting: setIsCategoryDrawerSubmitting,
    isAddDrawerOpen: isAddCategoryDrawerOpen,
    setIsAddDrawerOpen: setIsAddCategoryDrawerOpen,
    addDrawerError: addCategoryDrawerError,
    setAddDrawerError: setAddCategoryDrawerError,
    isAddDrawerSubmitting: isAddCategoryDrawerSubmitting,
    setIsAddDrawerSubmitting: setIsAddCategoryDrawerSubmitting,
    updateDraft: updateCategoryDraft,
    openDrawer: baseOpenCategoryDrawer,
    closeDrawer: baseCloseCategoryDrawer,
    openAddDrawer: baseOpenAddCategoryDrawer,
    closeAddDrawer: baseCloseAddCategoryDrawer,
  } = useRecordDrawerState({
    items: categoryRecords,
    toDraft: buildCategoryDraftState,
  });
  const activeBankConfigItem = React.useMemo(
    () => institutions.find((item) => item.id === activeBankConfigId) ?? null,
    [institutions, activeBankConfigId]
  );
  const activeBankConfigDraft = React.useMemo(() => {
    if (!activeBankConfigItem) {
      return null;
    }
    return bankConfigDrafts[activeBankConfigItem.id] ?? null;
  }, [activeBankConfigItem, bankConfigDrafts]);
  const activeLoanOriginConfigItem = React.useMemo(
    () =>
      loanOriginConfigs.find((item) => item.loan_origin === activeLoanOriginConfigId) ?? null,
    [loanOriginConfigs, activeLoanOriginConfigId]
  );
  const activeLoanOriginConfigDraft = React.useMemo(() => {
    if (!activeLoanOriginConfigItem) {
      return null;
    }
    return (
      loanOriginConfigDrafts[activeLoanOriginConfigItem.loan_origin] ?? {
        loan_origin: activeLoanOriginConfigItem.loan_origin,
        statement_day: String(activeLoanOriginConfigItem.statement_day ?? ""),
        due_day: String(activeLoanOriginConfigItem.due_day ?? ""),
      }
    );
  }, [activeLoanOriginConfigItem, loanOriginConfigDrafts]);
  const buildIncomeCategoryDraftState = React.useCallback(
    (item) => ({
      name: item.name ?? "",
      color: resolveCategoryColor(item.color, `income:${item.id}:${item.name ?? ""}`),
    }),
    []
  );
  const {
    activeId: activeIncomeCategoryId,
    setActiveId: setActiveIncomeCategoryId,
    activeItem: activeIncomeCategoryItem,
    activeDraft: activeIncomeCategoryDraft,
    drawerError: incomeCategoryDrawerError,
    setDrawerError: setIncomeCategoryDrawerError,
    isDrawerSubmitting: isIncomeCategoryDrawerSubmitting,
    setIsDrawerSubmitting: setIsIncomeCategoryDrawerSubmitting,
    isAddDrawerOpen: isAddIncomeCategoryDrawerOpen,
    setIsAddDrawerOpen: setIsAddIncomeCategoryDrawerOpen,
    addDrawerError: addIncomeCategoryDrawerError,
    setAddDrawerError: setAddIncomeCategoryDrawerError,
    isAddDrawerSubmitting: isAddIncomeCategoryDrawerSubmitting,
    setIsAddDrawerSubmitting: setIsAddIncomeCategoryDrawerSubmitting,
    updateDraft: updateIncomeCategoryDraft,
    openDrawer: baseOpenIncomeCategoryDrawer,
    closeDrawer: baseCloseIncomeCategoryDrawer,
    openAddDrawer: baseOpenAddIncomeCategoryDrawer,
    closeAddDrawer: baseCloseAddIncomeCategoryDrawer,
  } = useRecordDrawerState({
    items: incomeCategoryRecords,
    toDraft: buildIncomeCategoryDraftState,
  });
  const buildSuggestionDraftState = React.useCallback(
    (item) => {
      const category = String(item?.category ?? "").trim();
      return {
        category,
        last_amount: formatAmountInput(String(item?.last_amount ?? "")),
        expense_category_id:
          item?.expense_category_id === null ||
          item?.expense_category_id === undefined
            ? ""
            : String(item.expense_category_id),
        selected_for_encoding: isSuggestionSelectedForEncoding(
          item?.selected_for_encoding
        ),
      };
    },
    [formatAmountInput]
  );
  const {
    activeId: activeSuggestionKey,
    setActiveId: setActiveSuggestionKey,
    activeItem: activeSuggestionItem,
    activeDraft: activeSuggestionDraft,
    drawerError: suggestionDrawerError,
    setDrawerError: setSuggestionDrawerError,
    isDrawerSubmitting: isSuggestionDrawerSubmitting,
    setIsDrawerSubmitting: setIsSuggestionDrawerSubmitting,
    isAddDrawerOpen: isAddSuggestionDrawerOpen,
    setIsAddDrawerOpen: setIsAddSuggestionDrawerOpen,
    updateDraft: updateSuggestionDraft,
    openDrawer: baseOpenSuggestionDrawer,
    closeDrawer: baseCloseSuggestionDrawer,
    openAddDrawer: baseOpenAddSuggestionDrawer,
    closeAddDrawer: baseCloseAddSuggestionDrawer,
  } = useRecordDrawerState({
    items: suggestions.filter((item) => String(item?.category ?? "").trim()),
    getItemKey: suggestionKey,
    toDraft: buildSuggestionDraftState,
    formatFieldValue: (field, value) =>
      field === "last_amount"
        ? formatAmountInput(value)
        : field === "selected_for_encoding"
          ? isSuggestionSelectedForEncoding(value)
          : String(value ?? ""),
  });
  const activeSuggestionIsSelectedForEncoding = React.useMemo(
    () =>
      isSuggestionSelectedForEncoding(
        activeSuggestionDraft?.selected_for_encoding ??
          activeSuggestionItem?.selected_for_encoding
      ),
    [activeSuggestionDraft, activeSuggestionItem]
  );
  const incomeCategoryOptionMap = React.useMemo(() => {
    const map = new Map();
    incomeCategoryOptions.forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [incomeCategoryOptions]);
  const incomeCategoryColorByName = React.useMemo(() => {
    const map = new Map();
    incomeCategoryOptions.forEach((item) => {
      map.set(
        item.name,
        resolveCategoryColor(item.color, `income:${item.id}:${item.name || ""}`)
      );
    });
    return map;
  }, [incomeCategoryOptions]);
  const expenseCategoryOptionMap = React.useMemo(() => {
    const map = new Map();
    expenseCategoryOptions.forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [expenseCategoryOptions]);
  const expenseCategoryColorByName = React.useMemo(() => {
    const map = new Map();
    expenseCategoryOptions.forEach((item) => {
      map.set(
        item.name,
        resolveCategoryColor(item.color, `${item.id}:${item.name || ""}`)
      );
    });
    return map;
  }, [expenseCategoryOptions]);
  const addExpenseSuggestions = React.useMemo(() => {
    const selectedCategoryId = normalizeSuggestionCategoryId(
      expenseForm?.expense_category_id
    );
    return suggestions
      .filter((item) => {
        const name = String(item?.category || "").trim();
        if (!name) {
          return false;
        }
        if (!isSuggestionSelectedForEncoding(item?.selected_for_encoding)) {
          return false;
        }
        if (selectedCategoryId === 0) {
          return true;
        }
        return (
          normalizeSuggestionCategoryId(item?.expense_category_id) === selectedCategoryId
        );
      })
      .sort((a, b) => {
        const countDelta = Number(b?.count ?? 0) - Number(a?.count ?? 0);
        if (countDelta !== 0) {
          return countDelta;
        }
        return String(a?.category || "").localeCompare(String(b?.category || ""));
      })
      .slice(0, 12);
  }, [expenseForm?.expense_category_id, suggestions]);
  const debtCategoryOptionMap = React.useMemo(() => {
    const map = new Map();
    debtCategoryOptions.forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [debtCategoryOptions]);
  const debtCategoryColorByName = React.useMemo(() => {
    const map = new Map();
    debtCategoryOptions.forEach((item) => {
      map.set(
        item.name,
        resolveCategoryColor(item.color, `${item.id}:${item.name || ""}`)
      );
    });
    return map;
  }, [debtCategoryOptions]);
  const loanOriginDueDayMap = React.useMemo(() => {
    const map = new Map();
    loanOriginConfigs.forEach((item) => {
      const origin = typeof item?.loan_origin === "string" ? item.loan_origin.trim() : "";
      const dueDay = Number(item?.due_day);
      if (!origin || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
        return;
      }
      map.set(origin, dueDay);
    });
    return map;
  }, [loanOriginConfigs]);

  const selectedDebtIdSet = React.useMemo(
    () => new Set(selectedDebtIds),
    [selectedDebtIds]
  );
  const debtStatementCycleMap = React.useMemo(() => {
    const map = new Map();
    debtStatementCycleTotals.forEach((item) => {
      map.set(item.loan_origin, item);
    });
    return map;
  }, [debtStatementCycleTotals]);
  const groupedDebts = React.useMemo(() => {
    const grouped = new Map();
    sortedDebts.forEach((item) => {
      const loanOrigin =
        typeof item.loan_origin === "string" && item.loan_origin.trim()
          ? item.loan_origin.trim()
          : "Unassigned";
      const rows = grouped.get(loanOrigin) || [];
      rows.push(item);
      grouped.set(loanOrigin, rows);
    });

    return Array.from(grouped.entries())
      .map(([loanOrigin, rows]) => {
        const summary = debtStatementCycleMap.get(loanOrigin);
        const statementMonth =
          typeof summary?.statement_month === "string"
            ? summary.statement_month
            : debtCycleMonth;
        const amountTotal = rows.reduce((sum, item) => {
          const value = Number(item.amount ?? 0);
          return value > 0 ? sum + value : sum;
        }, 0);
        const totalPaid = rows.reduce((sum, item) => {
          const value = Number(item.amount ?? 0);
          return value < 0 ? sum + Math.abs(value) : sum;
        }, 0);
        const normalizedAmountTotal = normalizeMoneyValue(amountTotal);
        const normalizedTotalPaid = normalizeMoneyValue(totalPaid);
        const calculatedBalance = normalizeMoneyValue(
          normalizedAmountTotal - normalizedTotalPaid
        );
        const summaryTotal =
          summary?.total === null || summary?.total === undefined
            ? null
            : Number(summary.total);
        const normalizedBalance = normalizeMoneyValue(
          summaryTotal === null ? calculatedBalance : summaryTotal
        );
        return {
          loanOrigin,
          rows,
          statementMonth,
          amountTotal: normalizedAmountTotal,
          totalPaid: normalizedTotalPaid,
          total: normalizedBalance,
          balance: normalizedBalance,
          cycleLabel: statementLabel(statementMonth),
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [sortedDebts, debtStatementCycleMap, debtCycleMonth]);

  React.useEffect(() => {
    setExpandedDebtGroups((prev) => {
      let changed = false;
      const next = {};
      groupedDebts.forEach((group) => {
        if (Object.prototype.hasOwnProperty.call(prev, group.loanOrigin)) {
          next[group.loanOrigin] = prev[group.loanOrigin];
          return;
        }
        next[group.loanOrigin] = true;
        changed = true;
      });
      if (Object.keys(prev).length !== groupedDebts.length) {
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [groupedDebts]);

  const visibleDebtIds = React.useMemo(() => {
    const ids = [];
    groupedDebts.forEach((group) => {
      if (expandedDebtGroups[group.loanOrigin] === false) {
        return;
      }
      group.rows.forEach((row) => ids.push(row.id));
    });
    return ids;
  }, [groupedDebts, expandedDebtGroups]);

  const selectedVisibleDebtCount = React.useMemo(() => {
    return visibleDebtIds.reduce((count, id) => {
      if (selectedDebtIdSet.has(id)) {
        return count + 1;
      }
      return count;
    }, 0);
  }, [visibleDebtIds, selectedDebtIdSet]);
  const selectedFilteredDebtCount = selectedDebtIds.length;
  const allVisibleDebtsSelected =
    visibleDebtIds.length > 0 &&
    selectedVisibleDebtCount === visibleDebtIds.length;
  const someVisibleDebtsSelected =
    selectedVisibleDebtCount > 0 && !allVisibleDebtsSelected;
  const debtSelectAllRef = React.useRef(null);

  const toggleDebtGroup = (loanOrigin) => {
    setExpandedDebtGroups((prev) => ({
      ...prev,
      [loanOrigin]: prev[loanOrigin] === false,
    }));
  };

  const handleDebtGroupRowKeyDown = (event, loanOrigin) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleDebtGroup(loanOrigin);
    }
  };

  React.useEffect(() => {
    if (debtSelectAllRef.current) {
      debtSelectAllRef.current.indeterminate = someVisibleDebtsSelected;
    }
  }, [someVisibleDebtsSelected]);

  React.useEffect(() => {
    if (selectedVisibleDebtCount <= 1) {
      setDebtBulkAction("");
    }
  }, [selectedVisibleDebtCount]);

  useRightPanelUiResets({
    activeView,
    activeIncomeId,
    setActiveIncomeId,
    setIncomeDrawerError,
    setIsIncomeDrawerSubmitting,
    isAddIncomeDrawerOpen,
    setIsAddIncomeDrawerOpen,
    setAddIncomeDrawerError,
    isIncomeDrawerSubmitting,
    isAddIncomeDrawerSubmitting,
    activeExpenseId,
    setActiveExpenseId,
    setExpenseDrawerError,
    setIsExpenseDrawerSubmitting,
    isAddExpenseDrawerOpen,
    setIsAddExpenseDrawerOpen,
    setAddExpenseDrawerError,
    isExpenseDrawerSubmitting,
    isAddExpenseDrawerSubmitting,
    activeRecurringItemId,
    setActiveRecurringItemId,
    setRecurringDrawerError,
    setIsRecurringDrawerSubmitting,
    isAddRecurringDrawerOpen,
    setIsAddRecurringDrawerOpen,
    setAddRecurringDrawerError,
    isRecurringDrawerSubmitting,
    isAddRecurringDrawerSubmitting,
    activeDebtId,
    setActiveDebtId,
    setDebtDrawerError,
    setIsDebtDrawerSubmitting,
    isAddDebtDrawerOpen,
    setIsAddDebtDrawerOpen,
    setAddDebtDrawerError,
    isDebtDrawerSubmitting,
    isAddDebtDrawerSubmitting,
    isImportDebtDrawerOpen,
    setIsImportDebtDrawerOpen,
    setDebtCsvImportError,
    isDebtCsvImporting,
    setIsDebtCsvImporting,
    activeBankConfigId,
    setActiveBankConfigId,
    isAddBankDrawerOpen,
    setIsAddBankDrawerOpen,
    setBankDrawerError,
    setIsBankDrawerSubmitting,
    isBankDrawerSubmitting,
    activeCategoryId,
    setActiveCategoryId,
    isAddCategoryDrawerOpen,
    setIsAddCategoryDrawerOpen,
    setAddCategoryDraft,
    setCategoryDrawerError,
    setIsCategoryDrawerSubmitting,
    isCategoryDrawerSubmitting,
    activeIncomeCategoryId,
    setActiveIncomeCategoryId,
    isAddIncomeCategoryDrawerOpen,
    setIsAddIncomeCategoryDrawerOpen,
    setAddIncomeCategoryDraft,
    setIncomeCategoryDrawerError,
    setIsIncomeCategoryDrawerSubmitting,
    isIncomeCategoryDrawerSubmitting,
    activeSuggestionKey,
    setActiveSuggestionKey,
    isAddSuggestionDrawerOpen,
    setIsAddSuggestionDrawerOpen,
    setAddSuggestionDraft,
    setSuggestionDrawerError,
    setIsSuggestionDrawerSubmitting,
    isSuggestionDrawerSubmitting,
    defaultCategoryColor: CATEGORY_COLOR_SWATCHES[0] ?? "",
    institutions,
    setBankConfigDrafts,
    loanOriginConfigs,
    setLoanOriginConfigDrafts,
    configTab,
  });

  const buildRecurringPayload = (item, overrides = {}) => {
    const draft = recurringDrafts[item.id] ?? {};
    const type = overrides.type ?? draft.type ?? item.type;
    const frequency = overrides.frequency ?? draft.frequency ?? item.frequency;
    const categoryIdRaw =
      overrides.expense_category_id ??
      draft.expense_category_id ??
      (item.expense_category_id === null || item.expense_category_id === undefined
        ? ""
        : String(item.expense_category_id));
    const incomeCategoryIdRaw =
      overrides.income_category_id ??
      draft.income_category_id ??
      (item.income_category_id === null || item.income_category_id === undefined
        ? ""
        : String(item.income_category_id));
    const fromAccountIdRaw =
      overrides.from_account_id ??
      draft.from_account_id ??
      (item.from_account_id === null || item.from_account_id === undefined
        ? ""
        : String(item.from_account_id));
    const toAccountIdRaw =
      overrides.to_account_id ??
      draft.to_account_id ??
      (item.to_account_id === null || item.to_account_id === undefined
        ? ""
        : String(item.to_account_id));
    const mirrorAsIncomeExpense =
      overrides.mirror_as_income_expense ??
      draft.mirror_as_income_expense ??
      Boolean(item.mirror_as_income_expense);
    const transferFeeAmountRaw =
      overrides.transfer_fee_amount ??
      draft.transfer_fee_amount ??
      String(item.transfer_fee_amount ?? "");
    const semiMonthlyDay1Raw =
      overrides.semi_monthly_day_1 ??
      draft.semi_monthly_day_1 ??
      (item.semi_monthly_day_1 === null || item.semi_monthly_day_1 === undefined
        ? ""
        : String(item.semi_monthly_day_1));
    const semiMonthlyDay2Raw =
      overrides.semi_monthly_day_2 ??
      draft.semi_monthly_day_2 ??
      (item.semi_monthly_day_2 === null || item.semi_monthly_day_2 === undefined
        ? ""
        : String(item.semi_monthly_day_2));
    const normalizedSemiMonthlyDays = normalizeSemiMonthlyDays(
      semiMonthlyDay1Raw,
      semiMonthlyDay2Raw
    );
    const useSemiMonthlyDays = type === "income" && frequency === "semi_monthly";
    return {
      type,
      amount: Number(
        String(overrides.amount ?? draft.amount ?? item.amount ?? "").replace(
          /,/g,
          ""
        )
      ),
      category: overrides.category ?? draft.category ?? item.category,
      entity_id: item.entity_id,
      expense_category_id:
        (type === "expense" || type === "transfer") &&
        categoryIdRaw !== "" &&
        categoryIdRaw !== null &&
        categoryIdRaw !== undefined
          ? Number(categoryIdRaw)
          : null,
      income_category_id:
        (type === "income" || type === "transfer") &&
        incomeCategoryIdRaw !== "" &&
        incomeCategoryIdRaw !== null &&
        incomeCategoryIdRaw !== undefined
          ? Number(incomeCategoryIdRaw)
          : null,
      from_account_id:
        type === "transfer" &&
        fromAccountIdRaw !== "" &&
        fromAccountIdRaw !== null &&
        fromAccountIdRaw !== undefined
          ? Number(fromAccountIdRaw)
          : null,
      to_account_id:
        type === "transfer" &&
        toAccountIdRaw !== "" &&
        toAccountIdRaw !== null &&
        toAccountIdRaw !== undefined
          ? Number(toAccountIdRaw)
          : null,
      mirror_as_income_expense:
        type === "transfer" ? Boolean(mirrorAsIncomeExpense) : false,
      transfer_fee_amount:
        type === "transfer"
          ? Number(String(transferFeeAmountRaw ?? "").replace(/,/g, "") || "0")
          : 0,
      description: overrides.description ?? draft.description ?? item.description ?? null,
      frequency,
      semi_monthly_day_1:
        useSemiMonthlyDays && normalizedSemiMonthlyDays.valid
          ? normalizedSemiMonthlyDays.day1
          : null,
      semi_monthly_day_2:
        useSemiMonthlyDays && normalizedSemiMonthlyDays.valid
          ? normalizedSemiMonthlyDays.day2
          : null,
      next_due_date:
        overrides.next_due_date ?? draft.next_due_date ?? item.next_due_date,
    };
  };

  const buildIncomePayload = (item, overrides = {}) => {
    const draft = incomeDrafts[item.id] ?? {};
    const nextAmountRaw = String(
      overrides.amount ?? draft.amount ?? item.amount ?? ""
    ).replace(/,/g, "");
    return {
      amount: Number(nextAmountRaw),
      source: (overrides.source ?? draft.source ?? item.source ?? "").trim(),
      received_date:
        overrides.received_date ??
        draft.received_date ??
        item.received_date ??
        "",
      income_category_id:
        overrides.income_category_id ??
        draft.income_category_id ??
        (item.income_category_id === null || item.income_category_id === undefined
          ? ""
          : String(item.income_category_id)),
    };
  };

  const buildDebtPayload = (item, overrides = {}) => {
    const draft = debtDrafts[item.id] ?? {};
    const nextAmountRaw = String(
      overrides.amount ?? draft.amount ?? item.amount ?? ""
    ).replace(/,/g, "");
    return {
      amount: Number(nextAmountRaw),
      name: (overrides.name ?? draft.name ?? item.name ?? "").trim(),
      loan_origin:
        (overrides.loan_origin ?? draft.loan_origin ?? item.loan_origin ?? "").trim() ||
        null,
      notes: (overrides.notes ?? draft.notes ?? item.notes ?? "").trim() || null,
      spent_at: overrides.spent_at ?? draft.spent_at ?? item.spent_at,
      debt_category_id:
        overrides.debt_category_id ??
        draft.debt_category_id ??
        (item.debt_category_id === null || item.debt_category_id === undefined
          ? ""
          : String(item.debt_category_id)),
    };
  };
  const {
    openDebtDrawer,
    closeDebtDrawer,
    openAddDebtDrawer,
    closeAddDebtDrawer,
    openImportDebtDrawer,
    closeImportDebtDrawer,
    handleDebtRowKeyDown,
    handleDebtDrawerSubmit,
    handleDebtDrawerDelete,
    handleAddDebtDrawerSubmit,
    handleDebtCsvFileChange,
    handleDebtCsvImportSubmit,
    openDebtPayoffModal,
    closeDebtPayoffModal,
    handleDebtPayoffSubmit,
  } = createRightPanelDebtActions({
    onUpdateDebt,
    activeDebtItem,
    buildDebtPayload,
    setDebtDrawerError,
    setIsDebtDrawerSubmitting,
    onDeleteDebt,
    setIsImportDebtDrawerOpen,
    setDebtCsvImportError,
    baseOpenDebtDrawer,
    baseCloseDebtDrawer,
    baseOpenAddDebtDrawer,
    baseCloseAddDebtDrawer,
    setActiveDebtId,
    setIsAddDebtDrawerOpen,
    setAddDebtDrawerError,
    setIsAddDebtDrawerSubmitting,
    isDebtCsvImporting,
    onDebtCsvImport,
    debtCsvText,
    debtCsvDefaultLoanOrigin,
    debtCsvDefaultCategoryId,
    setDebtCsvText,
    setDebtCsvFileName,
    setDebtCsvDefaultLoanOrigin,
    setDebtCsvDefaultCategoryId,
    setIsDebtCsvImporting,
    onDebtSubmit,
    debtForm,
    setIsAddDebtDrawerOpenAfterSave: setIsAddDebtDrawerOpen,
    setAddDebtDrawerErrorAfterSave: setAddDebtDrawerError,
    onPayoffLoanOrigin,
    setDebtPayoffModal,
    setDebtPayoffForm,
    setDebtPayoffError,
    setIsDebtPayoffSubmitting,
    isDebtPayoffSubmitting,
    formatAmountInput,
    getTodayIsoLocal,
    formatMoney,
    debtPayoffModal,
    debtPayoffForm,
  });

  const {
    openCategoryDrawer,
    closeCategoryDrawer,
    openAddCategoryDrawer,
    closeAddCategoryDrawer,
    handleCategoryChipKeyDown,
    handleCategoryDrawerSubmit,
    handleCategoryDrawerDelete,
    handleAddCategoryDrawerSubmit,
    openIncomeCategoryDrawer,
    closeIncomeCategoryDrawer,
    openAddIncomeCategoryDrawer,
    closeAddIncomeCategoryDrawer,
    handleIncomeCategoryChipKeyDown,
    handleIncomeCategoryDrawerSubmit,
    handleIncomeCategoryDrawerDelete,
    handleAddIncomeCategoryDrawerSubmit,
    openSuggestionDrawer,
    openAddSuggestionDrawer,
    closeSuggestionDrawer,
    handleSuggestionChipKeyDown,
    handleSuggestionDrawerSubmit,
    handleSuggestionSelectionToggle,
    handleSuggestionDrawerDelete,
  } = createRightPanelConfigActions({
    defaultCategoryColor: CATEGORY_COLOR_SWATCHES[0] ?? "",
    resolveCategoryColor,
    formatAmountInput,
    suggestionKey,
    isSuggestionSelectedForEncoding,
    addCategoryDraft,
    setAddCategoryDraft,
    activeCategoryItem,
    activeCategoryDraft,
    onCategoryUpdate,
    setCategoryDrawerError,
    setIsCategoryDrawerSubmitting,
    setAddCategoryDrawerError,
    setIsAddCategoryDrawerSubmitting,
    onCategoryDelete,
    onCategoryCreate,
    setIsAddCategoryDrawerOpen,
    addIncomeCategoryDraft,
    setAddIncomeCategoryDraft,
    activeIncomeCategoryItem,
    activeIncomeCategoryDraft,
    onIncomeCategoryRecordUpdate,
    setIncomeCategoryDrawerError,
    setIsIncomeCategoryDrawerSubmitting,
    setAddIncomeCategoryDrawerError,
    setIsAddIncomeCategoryDrawerSubmitting,
    onIncomeCategoryDelete,
    onIncomeCategoryCreate,
    setIsAddIncomeCategoryDrawerOpen,
    addSuggestionDraft,
    setAddSuggestionDraft,
    activeSuggestionItem,
    activeSuggestionDraft,
    onSuggestionCreate,
    onSuggestionUpdate,
    setSuggestionDrawerError,
    setIsSuggestionDrawerSubmitting,
    isAddSuggestionDrawerOpen,
    setActiveSuggestionKey,
    setIsAddSuggestionDrawerOpen,
    activeSuggestionIsSelectedForEncoding,
    onSuggestionDelete,
    baseOpenCategoryDrawer,
    baseCloseCategoryDrawer,
    baseOpenAddCategoryDrawer,
    baseCloseAddCategoryDrawer,
    baseOpenIncomeCategoryDrawer,
    baseCloseIncomeCategoryDrawer,
    baseOpenAddIncomeCategoryDrawer,
    baseCloseAddIncomeCategoryDrawer,
    baseOpenSuggestionDrawer,
    baseCloseSuggestionDrawer,
    baseOpenAddSuggestionDrawer,
  });

  const getExpenseCategoryBadgeStyle = (categoryId, categoryName = "") => {
    if (categoryId === null || categoryId === undefined) {
      return undefined;
    }
    const option = expenseCategoryOptionMap.get(categoryId);
    if (!option) {
      return undefined;
    }
    const color = resolveCategoryColor(
      option.color,
      `${categoryId}:${option.name || categoryName}`
    );
    return buildCategoryBadgeStyle(color);
  };

  const getIncomeCategoryBadgeStyle = (categoryId, categoryName = "") => {
    if (categoryId === null || categoryId === undefined) {
      return undefined;
    }
    const option = incomeCategoryOptionMap.get(categoryId);
    if (!option) {
      return undefined;
    }
    const color = resolveCategoryColor(
      option.color,
      `income:${categoryId}:${option.name || categoryName}`
    );
    return buildCategoryBadgeStyle(color);
  };

  const getIncomeCategoryColorByName = (categoryName) => {
    const normalized = String(categoryName || "").trim() || "Uncategorized";
    const knownColor = incomeCategoryColorByName.get(normalized);
    return knownColor || resolveCategoryColor(null, `income:${normalized}`);
  };

  const getExpenseCategoryColorByName = (categoryName) => {
    const normalized = String(categoryName || "").trim() || "Uncategorized";
    const knownColor = expenseCategoryColorByName.get(normalized);
    return knownColor || resolveCategoryColor(null, `expense:${normalized}`);
  };

  const getDebtCategoryBadgeStyle = (categoryId, categoryName = "") => {
    if (categoryId === null || categoryId === undefined) {
      return undefined;
    }
    const option = debtCategoryOptionMap.get(categoryId);
    if (!option) {
      return undefined;
    }
    const color = resolveCategoryColor(
      option.color,
      `${categoryId}:${option.name || categoryName}`
    );
    return buildCategoryBadgeStyle(color);
  };

  const getDebtCategoryColorByName = (categoryName) => {
    const normalized = String(categoryName || "").trim() || "Uncategorized";
    const knownColor = debtCategoryColorByName.get(normalized);
    return knownColor || resolveCategoryColor(null, `debt:${normalized}`);
  };

  const getDebtRemainingDaysLabel = (loanOrigin, statementMonth) => {
    const normalizedOrigin =
      typeof loanOrigin === "string" ? loanOrigin.trim() : "";
    if (!normalizedOrigin || normalizedOrigin === "Unassigned") {
      return "-";
    }
    const dueDay = loanOriginDueDayMap.get(normalizedOrigin);
    if (!dueDay) {
      return "-";
    }
    const dueDate = getDueDateForStatementMonth(statementMonth, dueDay);
    const dayDiff = diffDaysFromToday(dueDate);
    return formatRemainingDaysLabel(dayDiff);
  };

  const buildExpensePayload = (item, overrides = {}) => {
    const draft = expenseDrafts[item.id] ?? {};
    const nextAmountRaw = String(
      overrides.amount ?? draft.amount ?? item.amount ?? ""
    ).replace(/,/g, "");
    return {
      amount: Number(nextAmountRaw),
      name: (overrides.name ?? draft.name ?? item.name ?? "").trim(),
      notes: (overrides.notes ?? draft.notes ?? item.notes ?? "").trim() || null,
      spent_at: overrides.spent_at ?? draft.spent_at ?? item.spent_at,
      from_account_id:
        overrides.from_account_id ??
        draft.from_account_id ??
        (item.from_account_id === null || item.from_account_id === undefined
          ? ""
          : String(item.from_account_id)),
      expense_expectation: normalizeExpenseExpectation(
        overrides.expense_expectation ??
          draft.expense_expectation ??
          item.expense_expectation
      ),
      expense_category_id:
        overrides.expense_category_id ??
        draft.expense_category_id ??
        (item.expense_category_id === null || item.expense_category_id === undefined
          ? ""
          : String(item.expense_category_id)),
    };
  };

  const {
    handleIncomeDrawerSubmit,
    handleIncomeDrawerDelete,
    handleAddIncomeDrawerSubmit,
    handleExpenseDrawerSubmit,
    handleExpenseDrawerDelete,
    handleExpenseDrawerMarkRecurring,
    handleAddExpenseDrawerSubmit,
    applyAddExpenseSuggestion,
    handleRecurringDrawerSubmit,
    handleRecurringDrawerDelete,
    handleRecurringCategoryUpdate,
    handleAddRecurringDrawerSubmit,
  } = createRightPanelRecordActions({
    activeIncomeItem,
    onUpdateIncome,
    buildIncomePayload,
    setIncomeDrawerError,
    setIsIncomeDrawerSubmitting,
    onDeleteIncome,
    onIncomeSubmit,
    incomeForm,
    setAddIncomeDrawerError,
    setIsAddIncomeDrawerSubmitting,
    setIsAddIncomeDrawerOpen,
    activeExpenseItem,
    onUpdateExpense,
    buildExpensePayload,
    setExpenseDrawerError,
    setIsExpenseDrawerSubmitting,
    onDeleteExpense,
    onMarkExpenseRecurring,
    onExpenseSubmit,
    expenseForm,
    setAddExpenseDrawerError,
    setIsAddExpenseDrawerSubmitting,
    setIsAddExpenseDrawerOpen,
    onExpenseFormChange,
    formatAmountInput,
    activeRecurringItem,
    onUpdateRecurring,
    buildRecurringPayload,
    setRecurringDrawerError,
    setIsRecurringDrawerSubmitting,
    onDeleteRecurring,
    onRecurringSubmit,
    recurringForm,
    setAddRecurringDrawerError,
    setIsAddRecurringDrawerSubmitting,
    setIsAddRecurringDrawerOpen,
  });

  const renderRecurringTypeTable = (items, title, emptyMessage, headerContent = null) => (
    <RecurringTypeTable
      items={items}
      title={title}
      emptyMessage={emptyMessage}
      headerContent={headerContent}
      activeRecurringItemId={activeRecurringItemId}
      openRecurringDrawer={openRecurringDrawer}
      handleRecurringRowKeyDown={handleRecurringRowKeyDown}
      formatMoney={formatMoney}
      activeEntityFilterId={activeEntityFilterId}
      getRecurringTransferName={getRecurringTransferName}
      getRecurringTransferCategoryLabel={getRecurringTransferCategoryLabel}
      handleRecurringCategoryUpdate={handleRecurringCategoryUpdate}
      incomeCategoryOptions={incomeCategoryOptions}
      expenseCategoryOptions={expenseCategoryOptions}
      getIncomeCategoryBadgeStyle={getIncomeCategoryBadgeStyle}
      getExpenseCategoryBadgeStyle={getExpenseCategoryBadgeStyle}
    />
  );

  const {
    updateLoanOriginConfigDraft,
    updateBankConfigDraft,
    openBankConfigDrawer,
    closeBankConfigDrawer,
    openAddBankDrawer,
    closeAddBankDrawer,
    handleBankConfigKeyDown,
    handleBankConfigDrawerSubmit,
    handleAddBankDrawerSubmit,
    handleBankConfigDrawerDelete,
    parseDayDraft,
    handleLoanOriginConfigSave,
    handleCreateLoanOriginConfig,
    handleDeleteLoanOriginConfig,
    handleExportDataset,
  } = createRightPanelAdminActions({
    api,
    currency,
    loanOriginConfigDrafts,
    setLoanOriginConfigDrafts,
    bankConfigDrafts,
    setBankConfigDrafts,
    setActiveBankConfigId,
    setIsAddBankDrawerOpen,
    setBankDrawerError,
    setIsBankDrawerSubmitting,
    isBankDrawerSubmitting,
    setNewBankConfigForm,
    newBankConfigForm,
    activeBankConfigItem,
    activeBankConfigDraft,
    onInstitutionSave,
    onInstitutionDelete,
    onLoanOriginConfigSave,
    newLoanOriginForm,
    setNewLoanOriginForm,
    onLoanOriginConfigDelete,
    setDataExportError,
    setExportingDataset,
  });

  const openLoanOriginConfigDrawer = React.useCallback((loanOrigin) => {
    setIsAddLoanOriginDrawerOpen(false);
    setActiveLoanOriginConfigId(loanOrigin);
    setLoanOriginDrawerError("");
    setIsLoanOriginDrawerSubmitting(false);
  }, []);

  const closeLoanOriginConfigDrawer = React.useCallback(() => {
    if (isLoanOriginDrawerSubmitting) {
      return;
    }
    setActiveLoanOriginConfigId(null);
    setIsAddLoanOriginDrawerOpen(false);
    setLoanOriginDrawerError("");
  }, [isLoanOriginDrawerSubmitting]);

  const openAddLoanOriginDrawer = React.useCallback(() => {
    setActiveLoanOriginConfigId(null);
    setIsAddLoanOriginDrawerOpen(true);
    setNewLoanOriginForm({
      loan_origin: "",
      statement_day: "",
      due_day: "",
    });
    setLoanOriginDrawerError("");
    setIsLoanOriginDrawerSubmitting(false);
  }, [setNewLoanOriginForm]);

  const closeAddLoanOriginDrawer = React.useCallback(() => {
    if (isLoanOriginDrawerSubmitting) {
      return;
    }
    setIsAddLoanOriginDrawerOpen(false);
    setNewLoanOriginForm({
      loan_origin: "",
      statement_day: "",
      due_day: "",
    });
    setLoanOriginDrawerError("");
  }, [isLoanOriginDrawerSubmitting, setNewLoanOriginForm]);

  const handleLoanOriginConfigKeyDown = React.useCallback(
    (event, loanOrigin) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLoanOriginConfigDrawer(loanOrigin);
      }
    },
    [openLoanOriginConfigDrawer]
  );

  const handleLoanOriginConfigDrawerSubmit = React.useCallback(
    async (event) => {
      event.preventDefault();
      if (!activeLoanOriginConfigItem || !onLoanOriginConfigSave) {
        return;
      }
      const draft = activeLoanOriginConfigDraft ?? {
        loan_origin: activeLoanOriginConfigItem.loan_origin,
        statement_day: String(activeLoanOriginConfigItem.statement_day ?? ""),
        due_day: String(activeLoanOriginConfigItem.due_day ?? ""),
      };
      const nextLoanOrigin = String(draft.loan_origin || "").trim();
      const statementDay = parseDayDraft(draft.statement_day);
      const dueDay = parseDayDraft(draft.due_day);
      if (!nextLoanOrigin) {
        setLoanOriginDrawerError("Loan origin is required.");
        return;
      }
      if (!statementDay.valid || !dueDay.valid) {
        setLoanOriginDrawerError("Statement and due days must be between 1 and 31.");
        return;
      }
      setLoanOriginDrawerError("");
      setIsLoanOriginDrawerSubmitting(true);
      try {
        await onLoanOriginConfigSave({
          previous_loan_origin: activeLoanOriginConfigItem.loan_origin,
          loan_origin: nextLoanOrigin,
          statement_day: statementDay.value,
          due_day: dueDay.value,
        });
        setActiveLoanOriginConfigId(null);
      } catch (err) {
        setLoanOriginDrawerError(err.message || "Failed to save debt statement rule.");
      } finally {
        setIsLoanOriginDrawerSubmitting(false);
      }
    },
    [
      activeLoanOriginConfigDraft,
      activeLoanOriginConfigItem,
      onLoanOriginConfigSave,
      parseDayDraft,
    ]
  );

  const handleAddLoanOriginDrawerSubmit = React.useCallback(
    async (event) => {
      event.preventDefault();
      if (!onLoanOriginConfigSave) {
        return;
      }
      const loanOrigin = String(newLoanOriginForm.loan_origin || "").trim();
      const statementDay = parseDayDraft(newLoanOriginForm.statement_day);
      const dueDay = parseDayDraft(newLoanOriginForm.due_day);
      if (!loanOrigin) {
        setLoanOriginDrawerError("Loan origin is required.");
        return;
      }
      if (!statementDay.valid || !dueDay.valid) {
        setLoanOriginDrawerError("Statement and due days must be between 1 and 31.");
        return;
      }
      setLoanOriginDrawerError("");
      setIsLoanOriginDrawerSubmitting(true);
      try {
        await onLoanOriginConfigSave({
          loan_origin: loanOrigin,
          statement_day: statementDay.value,
          due_day: dueDay.value,
        });
        setIsAddLoanOriginDrawerOpen(false);
        setNewLoanOriginForm({
          loan_origin: "",
          statement_day: "",
          due_day: "",
        });
      } catch (err) {
        setLoanOriginDrawerError(err.message || "Failed to add debt statement rule.");
      } finally {
        setIsLoanOriginDrawerSubmitting(false);
      }
    },
    [newLoanOriginForm, onLoanOriginConfigSave, parseDayDraft, setNewLoanOriginForm]
  );

  const incomeViewProps = {
    incomeAccountOptions,
    defaultIncomeAccountOption,
    openAddIncomeDrawer,
    incomeMonth,
    onIncomeMonthChange,
    incomeMonths,
    monthLabel,
    incomeCategoryFilter,
    onIncomeCategoryFilterChange,
    incomeCategoryOptions,
    formatMoney,
    incomeTotal,
    filteredIncome,
    activeIncomeId,
    openIncomeDrawer,
    handleIncomeRowKeyDown,
    onIncomeCategoryUpdate,
    getIncomeCategoryBadgeStyle,
    activeIncomeItem,
    closeIncomeDrawer,
    isIncomeDrawerSubmitting,
    handleIncomeDrawerSubmit,
    activeIncomeDraft,
    updateIncomeDraft,
    incomeDrawerError,
    handleIncomeDrawerDelete,
    isAddIncomeDrawerOpen,
    closeAddIncomeDrawer,
    isAddIncomeDrawerSubmitting,
    handleAddIncomeDrawerSubmit,
    incomeForm,
    onIncomeFormChange,
    addIncomeDrawerError,
  };

  const expensesViewProps = {
    EXPENSE_EXPECTATION_OPTIONS,
    normalizeExpenseExpectation,
    expenseExpectationLabel,
    openAddExpenseDrawer,
    expenseMonth,
    onExpenseMonthChange,
    expenseMonths,
    monthLabel,
    expenseCategoryFilter,
    onExpenseCategoryFilterChange,
    expenseCategoryOptions,
    expenseDateFrom,
    onExpenseDateFromChange,
    expenseDateTo,
    onExpenseDateToChange,
    formatMoney,
    accounts,
    expenseTotal,
    sortedExpenses,
    expenseSort,
    onToggleExpenseSort,
    activeExpenseId,
    openExpenseDrawer,
    handleExpenseRowKeyDown,
    onExpenseExpectationUpdate,
    onExpenseCategoryUpdate,
    getExpenseCategoryBadgeStyle,
    activeExpenseItem,
    closeExpenseDrawer,
    isExpenseDrawerSubmitting,
    handleExpenseDrawerSubmit,
    activeExpenseDraft,
    updateExpenseDraft,
    expenseDrawerError,
    handleExpenseDrawerDelete,
    handleExpenseDrawerMarkRecurring,
    isAddExpenseDrawerOpen,
    closeAddExpenseDrawer,
    isAddExpenseDrawerSubmitting,
    handleAddExpenseDrawerSubmit,
    addExpenseSuggestions,
    suggestionKey,
    applyAddExpenseSuggestion,
    expenseForm,
    onExpenseFormChange,
    expenseAccountOptions,
    defaultExpenseAccountOption,
    addExpenseDrawerError,
  };

  const debtViewProps = {
    debtBulkAction,
    setDebtBulkAction,
    groupedDebts,
    openAddDebtDrawer,
    openImportDebtDrawer,
    debtMonth,
    onDebtMonthChange,
    debtMonths,
    debtCategoryFilter,
    onDebtCategoryFilterChange,
    debtCategoryOptions,
    formatMoney,
    debtTotal,
    selectedFilteredDebtCount,
    onDeleteSelectedDebts,
    statementLabel,
    debtCycleMonth,
    debtStatementCycleTotals,
    getDebtRemainingDaysLabel,
    expandedDebtGroups,
    toggleDebtGroup,
    handleDebtGroupRowKeyDown,
    onPayoffLoanOrigin,
    openDebtPayoffModal,
    debtSelectAllRef,
    allVisibleDebtsSelected,
    visibleDebtIds,
    onDebtSelectAllChange,
    debtSort,
    onToggleDebtSort,
    activeDebtId,
    openDebtDrawer,
    handleDebtRowKeyDown,
    selectedDebtIdSet,
    onDebtRowSelectionChange,
    onDebtCategoryUpdate,
    getDebtCategoryBadgeStyle,
    activeDebtItem,
    closeDebtDrawer,
    isDebtDrawerSubmitting,
    handleDebtDrawerSubmit,
    activeDebtDraft,
    updateDebtDraft,
    loanOriginOptions,
    debtDrawerError,
    handleDebtDrawerDelete,
    isAddDebtDrawerOpen,
    closeAddDebtDrawer,
    isAddDebtDrawerSubmitting,
    handleAddDebtDrawerSubmit,
    debtOrigins,
    onDebtOriginSuggestionSelect,
    onDebtFormChange,
    debtForm,
    addDebtDrawerError,
    isImportDebtDrawerOpen,
    closeImportDebtDrawer,
    isDebtCsvImporting,
    handleDebtCsvImportSubmit,
    handleDebtCsvFileChange,
    debtCsvDefaultLoanOrigin,
    setDebtCsvDefaultLoanOrigin,
    debtCsvDefaultCategoryId,
    setDebtCsvDefaultCategoryId,
    debtCsvFileName,
    debtCsvImportError,
    debtCsvText,
    debtPayoffModal,
    closeDebtPayoffModal,
    isDebtPayoffSubmitting,
    debtPayoffForm,
    setDebtPayoffForm,
    debtPayoffError,
    handleDebtPayoffSubmit,
  };

  if (activeView === "balance") {
    return (
      <RightPanelBalanceView
        expenseBreakdownTotal={expenseBreakdownTotal}
        expenseCategoryBreakdown={expenseCategoryBreakdown}
        debtCategoryBreakdownTotal={debtCategoryBreakdownTotal}
        debtCategoryBreakdown={debtCategoryBreakdown}
        getExpenseCategoryColorByName={getExpenseCategoryColorByName}
        getDebtCategoryColorByName={getDebtCategoryColorByName}
        breakdownView={breakdownView}
        setBreakdownView={setBreakdownView}
        debtBreakdownView={debtBreakdownView}
        setDebtBreakdownView={setDebtBreakdownView}
        hoveredCategory={hoveredCategory}
        setHoveredCategory={setHoveredCategory}
        hoveredDebtOrigin={hoveredDebtOrigin}
        setHoveredDebtOrigin={setHoveredDebtOrigin}
        formatMoney={formatMoney}
      />
    );
  }

  if (activeView === "reports") {
    return (
      <RightPanelReportsView
        selectedMonthlyReport={selectedMonthlyReport}
        selectedReportMonth={selectedReportMonth}
        monthLabel={monthLabel}
        getExpenseCategoryColorByName={getExpenseCategoryColorByName}
        getDebtCategoryColorByName={getDebtCategoryColorByName}
        buildPieSlicePaths={buildPieSlicePaths}
        formatMoney={formatMoney}
        formatPercent={formatPercent}
        reportsRouteMode={reportsRouteMode}
        onGenerateMonthlyReport={onGenerateMonthlyReport}
        monthlyReports={monthlyReports}
        onOpenReportDetail={onOpenReportDetail}
        onBackToReportsList={onBackToReportsList}
        isMonthlyReportLoading={isMonthlyReportLoading}
        hoveredCategory={hoveredCategory}
        setHoveredCategory={setHoveredCategory}
        hoveredDebtOrigin={hoveredDebtOrigin}
        setHoveredDebtOrigin={setHoveredDebtOrigin}
      />
    );
  }

  if (activeView === "income") {
    return <RightPanelIncomeView {...incomeViewProps} />;
  }

  if (activeView === "expenses") {
    return <RightPanelExpensesView {...expensesViewProps} />;
  }

  if (activeView === "recurring") {
    return (
      <RightPanelRecurringView
        openAddRecurringDrawer={openAddRecurringDrawer}
        recurringIncomeBreakdownTotals={recurringIncomeBreakdownTotals}
        recurringExpenseBreakdownTotals={recurringExpenseBreakdownTotals}
        recurringSpendingPowerMonthly={recurringSpendingPowerMonthly}
        recurringSpendingPowerWeekly={recurringSpendingPowerWeekly}
        formatMoney={formatMoney}
        pendingRecurringItems={pendingRecurringItems}
        onConfirmRecurring={onConfirmRecurring}
        onSkipRecurring={onSkipRecurring}
        activeEntityFilterId={activeEntityFilterId}
        handleRecurringCategoryUpdate={handleRecurringCategoryUpdate}
        incomeCategoryOptions={incomeCategoryOptions}
        expenseCategoryOptions={expenseCategoryOptions}
        getIncomeCategoryBadgeStyle={getIncomeCategoryBadgeStyle}
        getExpenseCategoryBadgeStyle={getExpenseCategoryBadgeStyle}
        recurringItems={recurringItems}
        recurringFrequencyFilter={recurringFrequencyFilter}
        setRecurringFrequencyFilter={setRecurringFrequencyFilter}
        recurringExpenseCategoryFilter={recurringExpenseCategoryFilter}
        setRecurringExpenseCategoryFilter={setRecurringExpenseCategoryFilter}
        filteredRecurringExpenseTotals={filteredRecurringExpenseTotals}
        filteredRecurringItems={filteredRecurringItems}
        filteredRecurringIncome={filteredRecurringIncome}
        filteredRecurringTransfers={filteredRecurringTransfers}
        filteredRecurringExpenses={filteredRecurringExpensesByCategory}
        renderRecurringTypeTable={renderRecurringTypeTable}
        activeRecurringItem={activeRecurringItem}
        closeRecurringDrawer={closeRecurringDrawer}
        isRecurringDrawerSubmitting={isRecurringDrawerSubmitting}
        handleRecurringDrawerSubmit={handleRecurringDrawerSubmit}
        activeRecurringDraft={activeRecurringDraft}
        updateRecurringDraft={updateRecurringDraft}
        activeRecurringSourceAccounts={activeRecurringSourceAccounts}
        activeRecurringDestinationAccounts={activeRecurringDestinationAccounts}
        activeRecurringSourceAccount={activeRecurringSourceAccount}
        isActiveRecurringTransferCrossEntity={isActiveRecurringTransferCrossEntity}
        recurringDrawerError={recurringDrawerError}
        handleRecurringDrawerDelete={handleRecurringDrawerDelete}
        isAddRecurringDrawerOpen={isAddRecurringDrawerOpen}
        closeAddRecurringDrawer={closeAddRecurringDrawer}
        isAddRecurringDrawerSubmitting={isAddRecurringDrawerSubmitting}
        handleAddRecurringDrawerSubmit={handleAddRecurringDrawerSubmit}
        recurringForm={recurringForm}
        onRecurringFormChange={onRecurringFormChange}
        addRecurringSourceAccounts={addRecurringSourceAccounts}
        addRecurringDestinationAccounts={addRecurringDestinationAccounts}
        addRecurringSourceAccount={addRecurringSourceAccount}
        isAddRecurringTransferCrossEntity={isAddRecurringTransferCrossEntity}
        addRecurringDrawerError={addRecurringDrawerError}
      />
    );
  }

  if (activeView === "insurance") {
    return (
      <RightPanelInsuranceView
        entities={entities}
        activeEntityFilterId={activeEntityFilterId}
        lifeInsurances={lifeInsurances}
        formatMoney={formatMoney}
        onCreateLifeInsurance={onCreateLifeInsurance}
        onUpdateLifeInsurance={onUpdateLifeInsurance}
        onDeleteLifeInsurance={onDeleteLifeInsurance}
      />
    );
  }

  if (activeView === "budgeting") {
    return (
      <RightPanelBudgetView
        entities={entities}
        activeEntityFilterId={activeEntityFilterId}
        budgets={budgets}
        balance={balance}
        formatMoney={formatMoney}
        onCreateBudget={onCreateBudget}
        onUpdateBudget={onUpdateBudget}
        onDeleteBudget={onDeleteBudget}
      />
    );
  }

  if (activeView === "debts") {
    return <RightPanelDebtView {...debtViewProps} />;
  }

  if (activeView === "transactions") {
    return (
      <RightPanelTransactionsView
        incomeViewProps={incomeViewProps}
        expensesViewProps={expensesViewProps}
        debtViewProps={debtViewProps}
      />
    );
  }

  return (
    <RightPanelConfigView
      configTab={configTab}
      setConfigTab={setConfigTab}
      accountsViewProps={accountsViewProps}
      onCurrencyChange={onCurrencyChange}
      onCurrencySubmit={onCurrencySubmit}
      institutions={institutions}
      activeBankConfigId={activeBankConfigId}
      openBankConfigDrawer={openBankConfigDrawer}
      handleBankConfigKeyDown={handleBankConfigKeyDown}
      openAddBankDrawer={openAddBankDrawer}
      activeLoanOriginConfigId={activeLoanOriginConfigId}
      openLoanOriginConfigDrawer={openLoanOriginConfigDrawer}
      handleLoanOriginConfigKeyDown={handleLoanOriginConfigKeyDown}
      openAddLoanOriginDrawer={openAddLoanOriginDrawer}
      categoryRecords={categoryRecords}
      activeCategoryId={activeCategoryId}
      openCategoryDrawer={openCategoryDrawer}
      openAddCategoryDrawer={openAddCategoryDrawer}
      handleCategoryChipKeyDown={handleCategoryChipKeyDown}
      incomeCategoryRecords={incomeCategoryRecords}
      activeIncomeCategoryId={activeIncomeCategoryId}
      openIncomeCategoryDrawer={openIncomeCategoryDrawer}
      openAddIncomeCategoryDrawer={openAddIncomeCategoryDrawer}
      handleIncomeCategoryChipKeyDown={handleIncomeCategoryChipKeyDown}
      suggestions={suggestions}
      activeSuggestionKey={activeSuggestionKey}
      suggestionKey={suggestionKey}
      isSuggestionSelectedForEncoding={isSuggestionSelectedForEncoding}
      openAddSuggestionDrawer={openAddSuggestionDrawer}
      openSuggestionDrawer={openSuggestionDrawer}
      handleSuggestionChipKeyDown={handleSuggestionChipKeyDown}
      formatMoney={formatMoney}
      handleCreateLoanOriginConfig={handleCreateLoanOriginConfig}
      newLoanOriginForm={newLoanOriginForm}
      setNewLoanOriginForm={setNewLoanOriginForm}
      loanOriginConfigs={loanOriginConfigs}
      loanOriginConfigDrafts={loanOriginConfigDrafts}
      parseDayDraft={parseDayDraft}
      handleLoanOriginConfigSave={handleLoanOriginConfigSave}
      updateLoanOriginConfigDraft={updateLoanOriginConfigDraft}
      handleDeleteLoanOriginConfig={handleDeleteLoanOriginConfig}
      handleExportDataset={handleExportDataset}
      exportingDataset={exportingDataset}
      dataExportError={dataExportError}
      activeBankConfigItem={activeBankConfigItem}
      closeBankConfigDrawer={closeBankConfigDrawer}
      isBankDrawerSubmitting={isBankDrawerSubmitting}
      handleBankConfigDrawerSubmit={handleBankConfigDrawerSubmit}
      activeBankConfigDraft={activeBankConfigDraft}
      updateBankConfigDraft={updateBankConfigDraft}
      currency={currency}
      currencyOptions={currencyOptions}
      bankDrawerError={bankDrawerError}
      handleBankConfigDrawerDelete={handleBankConfigDrawerDelete}
      isAddBankDrawerOpen={isAddBankDrawerOpen}
      closeAddBankDrawer={closeAddBankDrawer}
      handleAddBankDrawerSubmit={handleAddBankDrawerSubmit}
      newBankConfigForm={newBankConfigForm}
      setNewBankConfigForm={setNewBankConfigForm}
      activeLoanOriginConfigItem={activeLoanOriginConfigItem}
      activeLoanOriginConfigDraft={activeLoanOriginConfigDraft}
      closeLoanOriginConfigDrawer={closeLoanOriginConfigDrawer}
      isLoanOriginDrawerSubmitting={isLoanOriginDrawerSubmitting}
      handleLoanOriginConfigDrawerSubmit={handleLoanOriginConfigDrawerSubmit}
      loanOriginDrawerError={loanOriginDrawerError}
      isAddLoanOriginDrawerOpen={isAddLoanOriginDrawerOpen}
      closeAddLoanOriginDrawer={closeAddLoanOriginDrawer}
      handleAddLoanOriginDrawerSubmit={handleAddLoanOriginDrawerSubmit}
      activeCategoryItem={activeCategoryItem}
      closeCategoryDrawer={closeCategoryDrawer}
      isCategoryDrawerSubmitting={isCategoryDrawerSubmitting}
      handleCategoryDrawerSubmit={handleCategoryDrawerSubmit}
      activeCategoryDraft={activeCategoryDraft}
      updateCategoryDraft={updateCategoryDraft}
      categoryDrawerError={categoryDrawerError}
      handleCategoryDrawerDelete={handleCategoryDrawerDelete}
      isAddCategoryDrawerOpen={isAddCategoryDrawerOpen}
      closeAddCategoryDrawer={closeAddCategoryDrawer}
      isAddCategoryDrawerSubmitting={isAddCategoryDrawerSubmitting}
      addCategoryDrawerError={addCategoryDrawerError}
      handleAddCategoryDrawerSubmit={handleAddCategoryDrawerSubmit}
      addCategoryDraft={addCategoryDraft}
      setAddCategoryDraft={setAddCategoryDraft}
      activeIncomeCategoryItem={activeIncomeCategoryItem}
      closeIncomeCategoryDrawer={closeIncomeCategoryDrawer}
      isIncomeCategoryDrawerSubmitting={isIncomeCategoryDrawerSubmitting}
      handleIncomeCategoryDrawerSubmit={handleIncomeCategoryDrawerSubmit}
      activeIncomeCategoryDraft={activeIncomeCategoryDraft}
      updateIncomeCategoryDraft={updateIncomeCategoryDraft}
      incomeCategoryDrawerError={incomeCategoryDrawerError}
      handleIncomeCategoryDrawerDelete={handleIncomeCategoryDrawerDelete}
      isAddIncomeCategoryDrawerOpen={isAddIncomeCategoryDrawerOpen}
      closeAddIncomeCategoryDrawer={closeAddIncomeCategoryDrawer}
      isAddIncomeCategoryDrawerSubmitting={isAddIncomeCategoryDrawerSubmitting}
      addIncomeCategoryDrawerError={addIncomeCategoryDrawerError}
      handleAddIncomeCategoryDrawerSubmit={handleAddIncomeCategoryDrawerSubmit}
      addIncomeCategoryDraft={addIncomeCategoryDraft}
      setAddIncomeCategoryDraft={setAddIncomeCategoryDraft}
      activeSuggestionItem={activeSuggestionItem}
      isAddSuggestionDrawerOpen={isAddSuggestionDrawerOpen}
      closeSuggestionDrawer={closeSuggestionDrawer}
      isSuggestionDrawerSubmitting={isSuggestionDrawerSubmitting}
      handleSuggestionDrawerSubmit={handleSuggestionDrawerSubmit}
      addSuggestionDraft={addSuggestionDraft}
      setAddSuggestionDraft={setAddSuggestionDraft}
      activeSuggestionDraft={activeSuggestionDraft}
      updateSuggestionDraft={updateSuggestionDraft}
      expenseCategoryOptions={expenseCategoryOptions}
      suggestionDrawerError={suggestionDrawerError}
      activeSuggestionIsSelectedForEncoding={activeSuggestionIsSelectedForEncoding}
      handleSuggestionSelectionToggle={handleSuggestionSelectionToggle}
      handleSuggestionDrawerDelete={handleSuggestionDrawerDelete}
    />
  );
}
