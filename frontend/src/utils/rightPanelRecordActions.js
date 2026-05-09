import { normalizeSemiMonthlyDays } from "./recurring";

export function createRightPanelRecordActions({
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
}) {
  const handleIncomeDrawerSubmit = async (event) => {
    event.preventDefault();
    if (!activeIncomeItem || !onUpdateIncome) {
      return;
    }

    const payload = buildIncomePayload(activeIncomeItem);
    if (!payload.source || Number.isNaN(payload.amount) || !payload.received_date) {
      setIncomeDrawerError("Source, amount, and date are required.");
      return;
    }

    setIncomeDrawerError("");
    setIsIncomeDrawerSubmitting(true);
    try {
      await onUpdateIncome(activeIncomeItem.id, {
        ...payload,
        income_category_id:
          payload.income_category_id === "" ? null : Number(payload.income_category_id),
      });
    } catch (err) {
      setIncomeDrawerError(err.message || "Failed to update income.");
    } finally {
      setIsIncomeDrawerSubmitting(false);
    }
  };

  const handleIncomeDrawerDelete = async () => {
    if (!activeIncomeItem || !onDeleteIncome) {
      return;
    }
    setIncomeDrawerError("");
    setIsIncomeDrawerSubmitting(true);
    try {
      await onDeleteIncome(activeIncomeItem.id);
    } catch (err) {
      setIncomeDrawerError(err.message || "Failed to delete income.");
    } finally {
      setIsIncomeDrawerSubmitting(false);
    }
  };

  const handleAddIncomeDrawerSubmit = async (event) => {
    event.preventDefault();
    if (!onIncomeSubmit) {
      return;
    }
    const source = typeof incomeForm?.source === "string" ? incomeForm.source.trim() : "";
    const amount = Number(String(incomeForm?.amount ?? "").replace(/,/g, ""));
    const receivedDate =
      typeof incomeForm?.received_date === "string"
        ? incomeForm.received_date.trim()
        : "";
    if (!source || Number.isNaN(amount) || !receivedDate) {
      setAddIncomeDrawerError("Source, amount, and date are required.");
      return;
    }

    setAddIncomeDrawerError("");
    setIsAddIncomeDrawerSubmitting(true);
    try {
      const didSave = await onIncomeSubmit();
      if (didSave) {
        setIsAddIncomeDrawerOpen(false);
        setAddIncomeDrawerError("");
      } else {
        setAddIncomeDrawerError("Failed to add income.");
      }
    } catch (err) {
      setAddIncomeDrawerError(err.message || "Failed to add income.");
    } finally {
      setIsAddIncomeDrawerSubmitting(false);
    }
  };

  const handleExpenseDrawerSubmit = async (event) => {
    event.preventDefault();
    if (!activeExpenseItem || !onUpdateExpense) {
      return;
    }

    const payload = buildExpensePayload(activeExpenseItem);
    if (!payload.name || Number.isNaN(payload.amount) || !payload.spent_at) {
      setExpenseDrawerError("Name, amount, and date are required.");
      return;
    }

    setExpenseDrawerError("");
    setIsExpenseDrawerSubmitting(true);
    try {
      await onUpdateExpense(activeExpenseItem.id, {
        ...payload,
        expense_category_id:
          payload.expense_category_id === "" ? null : Number(payload.expense_category_id),
      });
    } catch (err) {
      setExpenseDrawerError(err.message || "Failed to update expense.");
    } finally {
      setIsExpenseDrawerSubmitting(false);
    }
  };

  const handleExpenseDrawerDelete = async () => {
    if (!activeExpenseItem || !onDeleteExpense) {
      return;
    }
    setExpenseDrawerError("");
    setIsExpenseDrawerSubmitting(true);
    try {
      await onDeleteExpense(activeExpenseItem.id);
    } catch (err) {
      setExpenseDrawerError(err.message || "Failed to delete expense.");
    } finally {
      setIsExpenseDrawerSubmitting(false);
    }
  };

  const handleExpenseDrawerMarkRecurring = async () => {
    if (!activeExpenseItem || !onMarkExpenseRecurring) {
      return;
    }
    setExpenseDrawerError("");
    setIsExpenseDrawerSubmitting(true);
    try {
      await onMarkExpenseRecurring(activeExpenseItem.id);
    } catch (err) {
      setExpenseDrawerError(err.message || "Failed to mark expense recurring.");
    } finally {
      setIsExpenseDrawerSubmitting(false);
    }
  };

  const handleAddExpenseDrawerSubmit = async (event) => {
    event.preventDefault();
    if (!onExpenseSubmit) {
      return;
    }
    const name = typeof expenseForm?.name === "string" ? expenseForm.name.trim() : "";
    const amount = Number(String(expenseForm?.amount ?? "").replace(/,/g, ""));
    const spentAt =
      typeof expenseForm?.spent_at === "string" ? expenseForm.spent_at.trim() : "";
    if (!name || Number.isNaN(amount) || !spentAt) {
      setAddExpenseDrawerError("Name, amount, and date are required.");
      return;
    }

    setAddExpenseDrawerError("");
    setIsAddExpenseDrawerSubmitting(true);
    try {
      const didSave = await onExpenseSubmit();
      if (didSave) {
        setIsAddExpenseDrawerOpen(false);
        setAddExpenseDrawerError("");
      } else {
        setAddExpenseDrawerError("Failed to add expense.");
      }
    } catch (err) {
      setAddExpenseDrawerError(err.message || "Failed to add expense.");
    } finally {
      setIsAddExpenseDrawerSubmitting(false);
    }
  };

  const applyAddExpenseSuggestion = (item) => {
    if (!onExpenseFormChange) {
      return;
    }
    onExpenseFormChange("name", item?.category ?? "");
    onExpenseFormChange("amount", formatAmountInput(String(item?.last_amount ?? "")));
    onExpenseFormChange(
      "expense_category_id",
      item?.expense_category_id === null || item?.expense_category_id === undefined
        ? ""
        : Number(item.expense_category_id)
    );
  };

  const handleRecurringDrawerSubmit = async (event) => {
    event.preventDefault();
    if (!activeRecurringItem || !onUpdateRecurring) {
      return;
    }
    const payload = buildRecurringPayload(activeRecurringItem);
    if (
      !payload.category?.trim() ||
      Number.isNaN(payload.amount) ||
      !payload.next_due_date
    ) {
      setRecurringDrawerError(
        "Name / Source, amount, and next due date are required."
      );
      return;
    }
    if (payload.type === "income" && payload.frequency === "semi_monthly") {
      const normalizedSemiMonthlyDays = normalizeSemiMonthlyDays(
        payload.semi_monthly_day_1,
        payload.semi_monthly_day_2
      );
      if (!normalizedSemiMonthlyDays.valid) {
        setRecurringDrawerError(
          "Semi-monthly income requires two distinct cutoff days between 1 and 31."
        );
        return;
      }
      payload.semi_monthly_day_1 = normalizedSemiMonthlyDays.day1;
      payload.semi_monthly_day_2 = normalizedSemiMonthlyDays.day2;
    }
    if (payload.type === "transfer") {
      if (!Number.isInteger(payload.from_account_id) || payload.from_account_id <= 0) {
        setRecurringDrawerError("Select a source account.");
        return;
      }
      if (!Number.isInteger(payload.to_account_id) || payload.to_account_id <= 0) {
        setRecurringDrawerError("Select a destination account.");
        return;
      }
      if (payload.from_account_id === payload.to_account_id) {
        setRecurringDrawerError("Transfer must use two different accounts.");
        return;
      }
      if (
        !Number.isFinite(Number(payload.transfer_fee_amount ?? 0)) ||
        Number(payload.transfer_fee_amount ?? 0) < 0
      ) {
        setRecurringDrawerError("Enter a valid transfer fee.");
        return;
      }
    }

    setRecurringDrawerError("");
    setIsRecurringDrawerSubmitting(true);
    try {
      await onUpdateRecurring(activeRecurringItem.id, payload);
    } catch (err) {
      setRecurringDrawerError(err.message || "Failed to update recurring item.");
    } finally {
      setIsRecurringDrawerSubmitting(false);
    }
  };

  const handleRecurringDrawerDelete = async () => {
    if (!activeRecurringItem || !onDeleteRecurring) {
      return;
    }
    setRecurringDrawerError("");
    setIsRecurringDrawerSubmitting(true);
    try {
      await onDeleteRecurring(activeRecurringItem.id);
    } catch (err) {
      setRecurringDrawerError(err.message || "Failed to delete recurring item.");
    } finally {
      setIsRecurringDrawerSubmitting(false);
    }
  };

  const handleRecurringCategoryUpdate = async (item, categoryId) => {
    if (!onUpdateRecurring || item?.type === "transfer") {
      return;
    }
    const categoryField =
      item?.type === "income" ? "income_category_id" : "expense_category_id";
    const payload = buildRecurringPayload(item, {
      [categoryField]:
        categoryId === null || categoryId === undefined ? "" : String(categoryId),
    });
    try {
      await onUpdateRecurring(item.id, payload);
    } catch (err) {
      setRecurringDrawerError(err.message || "Failed to update recurring category.");
    }
  };

  const handleAddRecurringDrawerSubmit = async (event) => {
    event.preventDefault();
    if (!onRecurringSubmit) {
      return;
    }

    const category =
      typeof recurringForm?.category === "string" ? recurringForm.category.trim() : "";
    const amount = Number(String(recurringForm?.amount ?? "").replace(/,/g, ""));
    const nextDueDate =
      typeof recurringForm?.next_due_date === "string"
        ? recurringForm.next_due_date.trim()
        : "";

    if (!category || Number.isNaN(amount) || !nextDueDate) {
      setAddRecurringDrawerError(
        "Name / Source, amount, and next due date are required."
      );
      return;
    }
    if (
      recurringForm?.type === "income" &&
      recurringForm?.frequency === "semi_monthly"
    ) {
      const normalizedSemiMonthlyDays = normalizeSemiMonthlyDays(
        recurringForm?.semi_monthly_day_1,
        recurringForm?.semi_monthly_day_2
      );
      if (!normalizedSemiMonthlyDays.valid) {
        setAddRecurringDrawerError(
          "Semi-monthly income requires two distinct cutoff days between 1 and 31."
        );
        return;
      }
    }
    if (recurringForm?.type === "transfer") {
      const fromAccountId = Number(recurringForm?.from_account_id);
      const toAccountId = Number(recurringForm?.to_account_id);
      const transferFeeAmount = Number(
        String(recurringForm?.transfer_fee_amount ?? "").replace(/,/g, "") || "0"
      );
      if (!Number.isInteger(fromAccountId) || fromAccountId <= 0) {
        setAddRecurringDrawerError("Select a source account.");
        return;
      }
      if (!Number.isInteger(toAccountId) || toAccountId <= 0) {
        setAddRecurringDrawerError("Select a destination account.");
        return;
      }
      if (fromAccountId === toAccountId) {
        setAddRecurringDrawerError("Transfer must use two different accounts.");
        return;
      }
      if (!Number.isFinite(transferFeeAmount) || transferFeeAmount < 0) {
        setAddRecurringDrawerError("Enter a valid transfer fee.");
        return;
      }
    }

    setAddRecurringDrawerError("");
    setIsAddRecurringDrawerSubmitting(true);
    try {
      const didSave = await onRecurringSubmit();
      if (didSave) {
        setIsAddRecurringDrawerOpen(false);
        setAddRecurringDrawerError("");
      } else {
        setAddRecurringDrawerError("Failed to add recurring item.");
      }
    } catch (err) {
      setAddRecurringDrawerError(err.message || "Failed to add recurring item.");
    } finally {
      setIsAddRecurringDrawerSubmitting(false);
    }
  };

  return {
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
  };
}
