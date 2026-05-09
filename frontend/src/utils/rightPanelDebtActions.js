export function createRightPanelDebtActions({
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
  setIsAddDebtDrawerOpenAfterSave,
  setAddDebtDrawerErrorAfterSave,
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
}) {
  const openDebtDrawer = (id) => {
    setIsImportDebtDrawerOpen(false);
    setDebtCsvImportError("");
    baseOpenDebtDrawer(id);
  };

  const closeDebtDrawer = () => {
    baseCloseDebtDrawer();
  };

  const openAddDebtDrawer = () => {
    setIsImportDebtDrawerOpen(false);
    setDebtCsvImportError("");
    baseOpenAddDebtDrawer();
  };

  const closeAddDebtDrawer = () => {
    baseCloseAddDebtDrawer();
  };

  const openImportDebtDrawer = () => {
    setActiveDebtId(null);
    setDebtDrawerError("");
    setIsDebtDrawerSubmitting(false);
    setIsAddDebtDrawerOpen(false);
    setAddDebtDrawerError("");
    setIsAddDebtDrawerSubmitting(false);
    setIsImportDebtDrawerOpen(true);
    setDebtCsvImportError("");
  };

  const closeImportDebtDrawer = () => {
    if (isDebtCsvImporting) {
      return;
    }
    setIsImportDebtDrawerOpen(false);
    setDebtCsvImportError("");
  };

  const handleDebtRowKeyDown = (event, id) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDebtDrawer(id);
    }
  };

  const handleDebtDrawerSubmit = async (event) => {
    event.preventDefault();
    if (!activeDebtItem || !onUpdateDebt) {
      return;
    }

    const payload = buildDebtPayload(activeDebtItem);
    if (!payload.name || Number.isNaN(payload.amount) || !payload.spent_at) {
      setDebtDrawerError("Name, amount, and date are required.");
      return;
    }

    setDebtDrawerError("");
    setIsDebtDrawerSubmitting(true);
    try {
      await onUpdateDebt(activeDebtItem.id, {
        ...payload,
        debt_category_id:
          payload.debt_category_id === "" ? null : Number(payload.debt_category_id),
      });
    } catch (err) {
      setDebtDrawerError(err.message || "Failed to update debt.");
    } finally {
      setIsDebtDrawerSubmitting(false);
    }
  };

  const handleDebtDrawerDelete = async () => {
    if (!activeDebtItem || !onDeleteDebt) {
      return;
    }
    setDebtDrawerError("");
    setIsDebtDrawerSubmitting(true);
    try {
      await onDeleteDebt(activeDebtItem.id);
    } catch (err) {
      setDebtDrawerError(err.message || "Failed to delete debt.");
    } finally {
      setIsDebtDrawerSubmitting(false);
    }
  };

  const handleAddDebtDrawerSubmit = async (event) => {
    event.preventDefault();
    if (!onDebtSubmit) {
      return;
    }
    const name = typeof debtForm?.name === "string" ? debtForm.name.trim() : "";
    const amount = Number(String(debtForm?.amount ?? "").replace(/,/g, ""));
    const spentAt = typeof debtForm?.spent_at === "string" ? debtForm.spent_at.trim() : "";
    if (!name || Number.isNaN(amount) || !spentAt) {
      setAddDebtDrawerErrorAfterSave("Name, amount, and date are required.");
      return;
    }

    setAddDebtDrawerErrorAfterSave("");
    setIsAddDebtDrawerSubmitting(true);
    try {
      const didSave = await onDebtSubmit();
      if (didSave) {
        setIsAddDebtDrawerOpenAfterSave(false);
        setAddDebtDrawerErrorAfterSave("");
      } else {
        setAddDebtDrawerErrorAfterSave("Failed to add debt.");
      }
    } catch (err) {
      setAddDebtDrawerErrorAfterSave(err.message || "Failed to add debt.");
    } finally {
      setIsAddDebtDrawerSubmitting(false);
    }
  };

  const handleDebtCsvFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setDebtCsvText("");
      setDebtCsvFileName("");
      return;
    }
    try {
      const text = await file.text();
      setDebtCsvText(text);
      setDebtCsvFileName(file.name);
      setDebtCsvImportError("");
    } catch {
      setDebtCsvImportError("Could not read CSV file");
      setDebtCsvText("");
      setDebtCsvFileName("");
    }
  };

  const handleDebtCsvImportSubmit = async (event) => {
    event.preventDefault();
    if (!onDebtCsvImport || !debtCsvText) {
      return;
    }
    setDebtCsvImportError("");
    setIsDebtCsvImporting(true);
    try {
      await onDebtCsvImport({
        csv: debtCsvText,
        default_loan_origin: debtCsvDefaultLoanOrigin.trim() || null,
        default_debt_category_id:
          debtCsvDefaultCategoryId === "" ? null : Number(debtCsvDefaultCategoryId),
      });
      setDebtCsvText("");
      setDebtCsvFileName("");
      setDebtCsvDefaultLoanOrigin("");
      setDebtCsvDefaultCategoryId("");
      setIsImportDebtDrawerOpen(false);
    } catch (err) {
      setDebtCsvImportError(err.message || "Failed to import debt CSV");
    } finally {
      setIsDebtCsvImporting(false);
    }
  };

  const openDebtPayoffModal = (group) => {
    if (!onPayoffLoanOrigin) {
      return;
    }
    if (group.loanOrigin === "Unassigned" || Number(group.total) <= 0) {
      return;
    }
    setDebtPayoffModal({
      loanOrigin: group.loanOrigin,
      statementMonth: group.statementMonth,
      maxAmount: Number(group.balance),
      cycleLabel: group.cycleLabel,
    });
    setDebtPayoffForm({
      payment_date: getTodayIsoLocal(),
      amount: formatAmountInput(String(Number(group.balance).toFixed(2))),
    });
    setDebtPayoffError("");
    setIsDebtPayoffSubmitting(false);
  };

  const closeDebtPayoffModal = () => {
    if (isDebtPayoffSubmitting) {
      return;
    }
    setDebtPayoffModal(null);
    setDebtPayoffForm({ payment_date: "", amount: "" });
    setDebtPayoffError("");
  };

  const handleDebtPayoffSubmit = async (event) => {
    event.preventDefault();
    if (!onPayoffLoanOrigin || !debtPayoffModal) {
      return;
    }

    const paymentDate =
      typeof debtPayoffForm.payment_date === "string"
        ? debtPayoffForm.payment_date.trim()
        : "";
    const parsedAmount = Number(String(debtPayoffForm.amount || "").replace(/,/g, ""));

    if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
      setDebtPayoffError("Payment date must use YYYY-MM-DD.");
      return;
    }
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setDebtPayoffError("Enter a valid payment amount greater than zero.");
      return;
    }
    if (parsedAmount > Number(debtPayoffModal.maxAmount)) {
      setDebtPayoffError(
        `Payment amount cannot exceed ${formatMoney(debtPayoffModal.maxAmount)} for this statement cycle.`
      );
      return;
    }

    setDebtPayoffError("");
    setIsDebtPayoffSubmitting(true);
    try {
      await onPayoffLoanOrigin({
        loan_origin: debtPayoffModal.loanOrigin,
        statement_month: debtPayoffModal.statementMonth,
        payment_date: paymentDate,
        amount: parsedAmount,
      });
      setDebtPayoffModal(null);
      setDebtPayoffForm({ payment_date: "", amount: "" });
    } catch (err) {
      setDebtPayoffError(err.message || "Failed to record debt payoff.");
    } finally {
      setIsDebtPayoffSubmitting(false);
    }
  };

  return {
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
  };
}
