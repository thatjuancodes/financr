export function createRightPanelAdminActions({
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
}) {
  const updateLoanOriginConfigDraft = (loanOrigin, field, value) => {
    const sanitized =
      field === "loan_origin"
        ? value
        : value.replace(/[^\d]/g, "").slice(0, 2);
    setLoanOriginConfigDrafts((prev) => ({
      ...prev,
      [loanOrigin]: {
        ...(prev[loanOrigin] ?? {
          loan_origin: loanOrigin,
          statement_day: "",
          due_day: "",
        }),
        [field]: sanitized,
      },
    }));
  };

  const updateBankConfigDraft = (id, field, value) => {
    setBankConfigDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {
          id,
          name: "",
          type: "bank",
          code: "",
          swift_code: "",
          currency_code: currency,
          is_active: true,
        }),
        [field]: value,
      },
    }));
  };

  const normalizeBankConfigDraft = (draft) => ({
    name: String(draft?.name || "").trim(),
    type: String(draft?.type || "bank").trim() === "e_wallet" ? "e_wallet" : "bank",
    code: String(draft?.code || "").trim(),
    swift_code: String(draft?.swift_code || "").trim().toUpperCase(),
    currency_code: String(draft?.currency_code || currency || "PHP").trim().toUpperCase(),
    is_active:
      typeof draft?.is_active === "boolean"
        ? draft.is_active
        : Number(draft?.is_active ?? 1) === 1,
  });

  const openBankConfigDrawer = (id) => {
    setIsAddBankDrawerOpen(false);
    setActiveBankConfigId(id);
    setBankDrawerError("");
    setIsBankDrawerSubmitting(false);
  };

  const closeBankConfigDrawer = () => {
    if (isBankDrawerSubmitting) {
      return;
    }
    setActiveBankConfigId(null);
    setIsAddBankDrawerOpen(false);
    setBankDrawerError("");
  };

  const openAddBankDrawer = () => {
    setActiveBankConfigId(null);
    setIsAddBankDrawerOpen(true);
    setNewBankConfigForm({
      name: "",
      type: "bank",
      code: "",
      swift_code: "",
      currency_code: currency,
      is_active: true,
    });
    setBankDrawerError("");
    setIsBankDrawerSubmitting(false);
  };

  const closeAddBankDrawer = () => {
    if (isBankDrawerSubmitting) {
      return;
    }
    setIsAddBankDrawerOpen(false);
    setNewBankConfigForm({
      name: "",
      type: "bank",
      code: "",
      swift_code: "",
      currency_code: currency,
      is_active: true,
    });
    setBankDrawerError("");
  };

  const handleBankConfigKeyDown = (event, id) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openBankConfigDrawer(id);
    }
  };

  const handleBankConfigDrawerSubmit = async (event) => {
    event.preventDefault();
    if (!activeBankConfigItem || !onInstitutionSave) {
      return;
    }
    const draft = normalizeBankConfigDraft(activeBankConfigDraft);
    if (!draft.name) {
      setBankDrawerError("Institution name is required.");
      return;
    }
    if (draft.type === "e_wallet" && draft.swift_code) {
      setBankDrawerError("SWIFT code must be empty for e-wallet institutions.");
      return;
    }
    setBankDrawerError("");
    setIsBankDrawerSubmitting(true);
    try {
      await onInstitutionSave({
        id: activeBankConfigItem.id,
        name: draft.name,
        code: draft.code || null,
        swift_code: draft.type === "bank" ? draft.swift_code || null : null,
        currency_code: draft.currency_code,
        is_active: draft.is_active,
      });
    } catch (err) {
      setBankDrawerError(err.message || "Failed to save institution.");
    } finally {
      setIsBankDrawerSubmitting(false);
    }
  };

  const handleAddBankDrawerSubmit = async (event) => {
    event.preventDefault();
    if (!onInstitutionSave) {
      return;
    }
    const draft = normalizeBankConfigDraft(newBankConfigForm);
    if (!draft.name) {
      setBankDrawerError("Institution name is required.");
      return;
    }
    if (draft.type === "e_wallet" && draft.swift_code) {
      setBankDrawerError("SWIFT code must be empty for e-wallet institutions.");
      return;
    }
    setBankDrawerError("");
    setIsBankDrawerSubmitting(true);
    try {
      await onInstitutionSave({
        name: draft.name,
        type: draft.type,
        code: draft.code || null,
        swift_code: draft.type === "bank" ? draft.swift_code || null : null,
        currency_code: draft.currency_code,
      });
      setIsAddBankDrawerOpen(false);
      setNewBankConfigForm({
        name: "",
        type: "bank",
        code: "",
        swift_code: "",
        currency_code: currency,
        is_active: true,
      });
    } catch (err) {
      setBankDrawerError(err.message || "Failed to add institution.");
    } finally {
      setIsBankDrawerSubmitting(false);
    }
  };

  const handleBankConfigDrawerDelete = async () => {
    if (!activeBankConfigItem || !onInstitutionDelete) {
      return;
    }
    const message = `Deactivate ${activeBankConfigItem.name}?`;
    if (typeof window !== "undefined" && !window.confirm(message)) {
      return;
    }
    setBankDrawerError("");
    setIsBankDrawerSubmitting(true);
    try {
      await onInstitutionDelete(activeBankConfigItem.id, activeBankConfigItem.name);
    } catch (err) {
      setBankDrawerError(err.message || "Failed to delete institution.");
    } finally {
      setIsBankDrawerSubmitting(false);
    }
  };

  const parseDayDraft = (value) => {
    if (value === "") {
      return { valid: true, value: null };
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
      return { valid: false, value: null };
    }
    return { valid: true, value: parsed };
  };

  const handleLoanOriginConfigSave = (loanOrigin) => {
    if (!onLoanOriginConfigSave) {
      return;
    }
    const draft = loanOriginConfigDrafts[loanOrigin] ?? {
      loan_origin: loanOrigin,
      statement_day: "",
      due_day: "",
    };
    const nextLoanOrigin = draft.loan_origin.trim();
    if (!nextLoanOrigin) {
      return;
    }
    const statementDay = parseDayDraft(draft.statement_day);
    const dueDay = parseDayDraft(draft.due_day);
    if (!statementDay.valid || !dueDay.valid) {
      return;
    }

    onLoanOriginConfigSave({
      previous_loan_origin: loanOrigin,
      loan_origin: nextLoanOrigin,
      statement_day: statementDay.value,
      due_day: dueDay.value,
    });
  };

  const handleCreateLoanOriginConfig = async (event) => {
    event.preventDefault();
    if (!onLoanOriginConfigSave) {
      return;
    }
    const loanOrigin = newLoanOriginForm.loan_origin.trim();
    if (!loanOrigin) {
      return;
    }
    const statementDay = parseDayDraft(newLoanOriginForm.statement_day);
    const dueDay = parseDayDraft(newLoanOriginForm.due_day);
    if (!statementDay.valid || !dueDay.valid) {
      return;
    }

    try {
      await onLoanOriginConfigSave({
        loan_origin: loanOrigin,
        statement_day: statementDay.value,
        due_day: dueDay.value,
      });
      setNewLoanOriginForm({
        loan_origin: "",
        statement_day: "",
        due_day: "",
      });
    } catch {}
  };

  const handleDeleteLoanOriginConfig = async (loanOrigin, debtCount) => {
    if (!onLoanOriginConfigDelete) {
      return;
    }
    const message =
      debtCount > 0
        ? `Delete ${loanOrigin}? This will also clear the loan origin from ${debtCount} debt record${debtCount === 1 ? "" : "s"}.`
        : `Delete ${loanOrigin}?`;
    if (typeof window !== "undefined" && !window.confirm(message)) {
      return;
    }
    try {
      await onLoanOriginConfigDelete(loanOrigin);
    } catch {}
  };

  const handleExportDataset = async (dataset) => {
    if (!dataset) {
      return;
    }
    setDataExportError("");
    setExportingDataset(dataset);
    try {
      const { blob, filename } = await api.exportCsv(dataset);
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = filename || `${dataset}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setDataExportError(err.message || "Failed to export data.");
    } finally {
      setExportingDataset("");
    }
  };

  return {
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
  };
}
