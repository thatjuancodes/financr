import React from "react";

export default function useRightPanelUiResets({
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
  defaultCategoryColor,
  institutions,
  setBankConfigDrafts,
  loanOriginConfigs,
  setLoanOriginConfigDrafts,
  configTab,
}) {
  React.useEffect(() => {
    if (
      activeView === "recurring" ||
      activeView === "expenses" ||
      activeView === "income" ||
      activeView === "debts" ||
      activeView === "config"
    ) {
      return;
    }
    setActiveIncomeId(null);
    setIncomeDrawerError("");
    setIsIncomeDrawerSubmitting(false);
    setIsAddIncomeDrawerOpen(false);
    setAddIncomeDrawerError("");
    setActiveExpenseId(null);
    setExpenseDrawerError("");
    setIsExpenseDrawerSubmitting(false);
    setIsAddExpenseDrawerOpen(false);
    setAddExpenseDrawerError("");
    setActiveRecurringItemId(null);
    setRecurringDrawerError("");
    setIsRecurringDrawerSubmitting(false);
    setIsAddRecurringDrawerOpen(false);
    setAddRecurringDrawerError("");
    setActiveDebtId(null);
    setDebtDrawerError("");
    setIsDebtDrawerSubmitting(false);
    setIsAddDebtDrawerOpen(false);
    setAddDebtDrawerError("");
    setIsImportDebtDrawerOpen(false);
    setDebtCsvImportError("");
    setIsDebtCsvImporting(false);
    setActiveBankConfigId(null);
    setIsAddBankDrawerOpen(false);
    setBankDrawerError("");
    setIsBankDrawerSubmitting(false);
    setActiveCategoryId(null);
    setIsAddCategoryDrawerOpen(false);
    setAddCategoryDraft({ name: "", color: defaultCategoryColor });
    setCategoryDrawerError("");
    setIsCategoryDrawerSubmitting(false);
    setActiveIncomeCategoryId(null);
    setIsAddIncomeCategoryDrawerOpen(false);
    setAddIncomeCategoryDraft({ name: "", color: defaultCategoryColor });
    setIncomeCategoryDrawerError("");
    setIsIncomeCategoryDrawerSubmitting(false);
    setActiveSuggestionKey(null);
    setIsAddSuggestionDrawerOpen(false);
    setAddSuggestionDraft({
      category: "",
      last_amount: "",
      expense_category_id: "",
      selected_for_encoding: false,
    });
    setSuggestionDrawerError("");
    setIsSuggestionDrawerSubmitting(false);
  }, [activeView]);

  React.useEffect(() => {
    if (
      !activeIncomeId &&
      !isAddIncomeDrawerOpen &&
      !activeExpenseId &&
      !isAddExpenseDrawerOpen &&
      !activeRecurringItemId &&
      !isAddRecurringDrawerOpen &&
      !activeDebtId &&
      !isAddDebtDrawerOpen &&
      !isImportDebtDrawerOpen &&
      !activeBankConfigId &&
      !isAddBankDrawerOpen &&
      !activeCategoryId &&
      !isAddCategoryDrawerOpen &&
      !activeIncomeCategoryId &&
      !isAddIncomeCategoryDrawerOpen &&
      !activeSuggestionKey &&
      !isAddSuggestionDrawerOpen
    ) {
      return;
    }
    const handleEscape = (event) => {
      if (
        event.key === "Escape" &&
        !isIncomeDrawerSubmitting &&
        !isAddIncomeDrawerSubmitting &&
        !isExpenseDrawerSubmitting &&
        !isAddExpenseDrawerSubmitting &&
        !isRecurringDrawerSubmitting &&
        !isAddRecurringDrawerSubmitting &&
        !isDebtDrawerSubmitting &&
        !isAddDebtDrawerSubmitting &&
        !isDebtCsvImporting &&
        !isBankDrawerSubmitting &&
        !isCategoryDrawerSubmitting &&
        !isIncomeCategoryDrawerSubmitting &&
        !isSuggestionDrawerSubmitting
      ) {
        setActiveIncomeId(null);
        setIncomeDrawerError("");
        setIsAddIncomeDrawerOpen(false);
        setAddIncomeDrawerError("");
        setActiveExpenseId(null);
        setExpenseDrawerError("");
        setIsAddExpenseDrawerOpen(false);
        setAddExpenseDrawerError("");
        setActiveRecurringItemId(null);
        setRecurringDrawerError("");
        setIsAddRecurringDrawerOpen(false);
        setAddRecurringDrawerError("");
        setActiveDebtId(null);
        setDebtDrawerError("");
        setIsAddDebtDrawerOpen(false);
        setAddDebtDrawerError("");
        setIsImportDebtDrawerOpen(false);
        setDebtCsvImportError("");
        setActiveBankConfigId(null);
        setIsAddBankDrawerOpen(false);
        setBankDrawerError("");
        setActiveCategoryId(null);
        setIsAddCategoryDrawerOpen(false);
        setAddCategoryDraft({ name: "", color: defaultCategoryColor });
        setCategoryDrawerError("");
        setActiveIncomeCategoryId(null);
        setIsAddIncomeCategoryDrawerOpen(false);
        setAddIncomeCategoryDraft({ name: "", color: defaultCategoryColor });
        setIncomeCategoryDrawerError("");
        setActiveSuggestionKey(null);
        setIsAddSuggestionDrawerOpen(false);
        setAddSuggestionDraft({
          category: "",
          last_amount: "",
          expense_category_id: "",
          selected_for_encoding: false,
        });
        setSuggestionDrawerError("");
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [
    activeIncomeId,
    isIncomeDrawerSubmitting,
    isAddIncomeDrawerOpen,
    isAddIncomeDrawerSubmitting,
    activeExpenseId,
    isExpenseDrawerSubmitting,
    isAddExpenseDrawerOpen,
    isAddExpenseDrawerSubmitting,
    activeRecurringItemId,
    isRecurringDrawerSubmitting,
    isAddRecurringDrawerOpen,
    isAddRecurringDrawerSubmitting,
    activeDebtId,
    isDebtDrawerSubmitting,
    isAddDebtDrawerOpen,
    isAddDebtDrawerSubmitting,
    isImportDebtDrawerOpen,
    isDebtCsvImporting,
    activeBankConfigId,
    isAddBankDrawerOpen,
    isBankDrawerSubmitting,
    activeCategoryId,
    isAddCategoryDrawerOpen,
    isCategoryDrawerSubmitting,
    activeIncomeCategoryId,
    isAddIncomeCategoryDrawerOpen,
    isIncomeCategoryDrawerSubmitting,
    activeSuggestionKey,
    isAddSuggestionDrawerOpen,
    isSuggestionDrawerSubmitting,
  ]);

  React.useEffect(() => {
    const nextDrafts = {};
    institutions.forEach((item) => {
      nextDrafts[item.id] = {
        id: item.id,
        name: String(item.name || ""),
        type: String(item.type || "bank"),
        code: String(item.code || ""),
        swift_code: String(item.swift_code || ""),
        is_active: Number(item.is_active ?? 1) === 1,
      };
    });
    setBankConfigDrafts(nextDrafts);
  }, [institutions]);

  React.useEffect(() => {
    const nextDrafts = {};
    loanOriginConfigs.forEach((item) => {
      nextDrafts[item.loan_origin] = {
        loan_origin: item.loan_origin,
        statement_day:
          item.statement_day === null || item.statement_day === undefined
            ? ""
            : String(item.statement_day),
        due_day:
          item.due_day === null || item.due_day === undefined
            ? ""
            : String(item.due_day),
      };
    });
    setLoanOriginConfigDrafts(nextDrafts);
  }, [loanOriginConfigs]);

  React.useEffect(() => {
    if (configTab !== "institutions") {
      setActiveBankConfigId(null);
      setIsAddBankDrawerOpen(false);
      setBankDrawerError("");
      setIsBankDrawerSubmitting(false);
    }
    if (configTab !== "categories") {
      setActiveCategoryId(null);
      setIsAddCategoryDrawerOpen(false);
      setAddCategoryDraft({ name: "", color: defaultCategoryColor });
      setCategoryDrawerError("");
      setIsCategoryDrawerSubmitting(false);
    }
    if (configTab !== "income-categories") {
      setActiveIncomeCategoryId(null);
      setIsAddIncomeCategoryDrawerOpen(false);
      setAddIncomeCategoryDraft({ name: "", color: defaultCategoryColor });
      setIncomeCategoryDrawerError("");
      setIsIncomeCategoryDrawerSubmitting(false);
    }
    if (configTab !== "suggestions") {
      setActiveSuggestionKey(null);
      setIsAddSuggestionDrawerOpen(false);
      setAddSuggestionDraft({
        category: "",
        last_amount: "",
        expense_category_id: "",
        selected_for_encoding: false,
      });
      setSuggestionDrawerError("");
      setIsSuggestionDrawerSubmitting(false);
    }
  }, [configTab]);
}
