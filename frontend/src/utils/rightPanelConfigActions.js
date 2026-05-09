export function createRightPanelConfigActions({
  defaultCategoryColor,
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
}) {
  const resetCategoryDraft = () => {
    setAddCategoryDraft({
      name: "",
      color: defaultCategoryColor,
    });
  };

  const resetIncomeCategoryDraft = () => {
    setAddIncomeCategoryDraft({
      name: "",
      color: defaultCategoryColor,
    });
  };

  const resetSuggestionDraft = () => {
    setAddSuggestionDraft({
      category: "",
      last_amount: "",
      expense_category_id: "",
      selected_for_encoding: false,
    });
  };

  const openCategoryDrawer = (id) => {
    resetCategoryDraft();
    baseOpenCategoryDrawer(id);
  };

  const closeCategoryDrawer = () => {
    baseCloseCategoryDrawer();
  };

  const openAddCategoryDrawer = () => {
    resetCategoryDraft();
    baseOpenAddCategoryDrawer();
  };

  const closeAddCategoryDrawer = () => {
    baseCloseAddCategoryDrawer();
    resetCategoryDraft();
  };

  const handleCategoryChipKeyDown = (event, id) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCategoryDrawer(id);
    }
  };

  const handleCategoryDrawerSubmit = async (event) => {
    event.preventDefault();
    if (!activeCategoryItem || !onCategoryUpdate) {
      return;
    }
    const name =
      typeof activeCategoryDraft?.name === "string"
        ? activeCategoryDraft.name.trim()
        : "";
    if (!name) {
      setCategoryDrawerError("Expense category name is required.");
      return;
    }
    const color = resolveCategoryColor(
      activeCategoryDraft?.color,
      `${activeCategoryItem.id}:${name}`
    );

    setCategoryDrawerError("");
    setIsCategoryDrawerSubmitting(true);
    try {
      await onCategoryUpdate(activeCategoryItem.id, { name, color });
    } catch (err) {
      setCategoryDrawerError(err.message || "Failed to update category.");
    } finally {
      setIsCategoryDrawerSubmitting(false);
    }
  };

  const handleCategoryDrawerDelete = async () => {
    if (!activeCategoryItem || !onCategoryDelete) {
      return;
    }
    setCategoryDrawerError("");
    setIsCategoryDrawerSubmitting(true);
    try {
      await onCategoryDelete(activeCategoryItem.id);
    } catch (err) {
      setCategoryDrawerError(err.message || "Failed to delete category.");
    } finally {
      setIsCategoryDrawerSubmitting(false);
    }
  };

  const handleAddCategoryDrawerSubmit = async (event) => {
    event.preventDefault();
    if (!onCategoryCreate) {
      return;
    }
    const name =
      typeof addCategoryDraft?.name === "string"
        ? addCategoryDraft.name.trim()
        : "";
    if (!name) {
      setAddCategoryDrawerError("Expense category name is required.");
      return;
    }
    const color = resolveCategoryColor(addCategoryDraft?.color, `new-expense:${name}`);
    setAddCategoryDrawerError("");
    setIsAddCategoryDrawerSubmitting(true);
    try {
      await onCategoryCreate({ name, color });
      setIsAddCategoryDrawerOpen(false);
      resetCategoryDraft();
    } catch (err) {
      setAddCategoryDrawerError(err.message || "Failed to add expense category.");
    } finally {
      setIsAddCategoryDrawerSubmitting(false);
    }
  };

  const openIncomeCategoryDrawer = (id) => {
    resetIncomeCategoryDraft();
    baseOpenIncomeCategoryDrawer(id);
  };

  const closeIncomeCategoryDrawer = () => {
    baseCloseIncomeCategoryDrawer();
  };

  const openAddIncomeCategoryDrawer = () => {
    resetIncomeCategoryDraft();
    baseOpenAddIncomeCategoryDrawer();
  };

  const closeAddIncomeCategoryDrawer = () => {
    baseCloseAddIncomeCategoryDrawer();
    resetIncomeCategoryDraft();
  };

  const handleIncomeCategoryChipKeyDown = (event, id) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openIncomeCategoryDrawer(id);
    }
  };

  const handleIncomeCategoryDrawerSubmit = async (event) => {
    event.preventDefault();
    if (!activeIncomeCategoryItem || !onIncomeCategoryRecordUpdate) {
      return;
    }
    const name =
      typeof activeIncomeCategoryDraft?.name === "string"
        ? activeIncomeCategoryDraft.name.trim()
        : "";
    if (!name) {
      setIncomeCategoryDrawerError("Income category name is required.");
      return;
    }
    const color = resolveCategoryColor(
      activeIncomeCategoryDraft?.color,
      `income:${activeIncomeCategoryItem.id}:${name}`
    );

    setIncomeCategoryDrawerError("");
    setIsIncomeCategoryDrawerSubmitting(true);
    try {
      await onIncomeCategoryRecordUpdate(activeIncomeCategoryItem.id, { name, color });
    } catch (err) {
      setIncomeCategoryDrawerError(
        err.message || "Failed to update income category."
      );
    } finally {
      setIsIncomeCategoryDrawerSubmitting(false);
    }
  };

  const handleIncomeCategoryDrawerDelete = async () => {
    if (!activeIncomeCategoryItem || !onIncomeCategoryDelete) {
      return;
    }
    setIncomeCategoryDrawerError("");
    setIsIncomeCategoryDrawerSubmitting(true);
    try {
      await onIncomeCategoryDelete(activeIncomeCategoryItem.id);
    } catch (err) {
      setIncomeCategoryDrawerError(
        err.message || "Failed to delete income category."
      );
    } finally {
      setIsIncomeCategoryDrawerSubmitting(false);
    }
  };

  const handleAddIncomeCategoryDrawerSubmit = async (event) => {
    event.preventDefault();
    if (!onIncomeCategoryCreate) {
      return;
    }
    const name =
      typeof addIncomeCategoryDraft?.name === "string"
        ? addIncomeCategoryDraft.name.trim()
        : "";
    if (!name) {
      setAddIncomeCategoryDrawerError("Income category name is required.");
      return;
    }
    const color = resolveCategoryColor(
      addIncomeCategoryDraft?.color,
      `new-income:${name}`
    );
    setAddIncomeCategoryDrawerError("");
    setIsAddIncomeCategoryDrawerSubmitting(true);
    try {
      await onIncomeCategoryCreate({ name, color });
      setIsAddIncomeCategoryDrawerOpen(false);
      resetIncomeCategoryDraft();
    } catch (err) {
      setAddIncomeCategoryDrawerError(
        err.message || "Failed to add income category."
      );
    } finally {
      setIsAddIncomeCategoryDrawerSubmitting(false);
    }
  };

  const openSuggestionDrawer = (item) => {
    resetSuggestionDraft();
    baseOpenSuggestionDrawer(suggestionKey(item));
  };

  const openAddSuggestionDrawer = () => {
    resetSuggestionDraft();
    baseOpenAddSuggestionDrawer();
  };

  const closeSuggestionDrawer = () => {
    baseCloseSuggestionDrawer();
    resetSuggestionDraft();
  };

  const handleSuggestionChipKeyDown = (event, item) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openSuggestionDrawer(item);
    }
  };

  const handleSuggestionDrawerSubmit = async (event) => {
    event.preventDefault();
    const isCreateMode = isAddSuggestionDrawerOpen && !activeSuggestionItem;
    const draft = isCreateMode ? addSuggestionDraft : activeSuggestionDraft;
    const originalSuggestion = activeSuggestionItem
      ? {
          category: activeSuggestionItem.category,
          expense_category_id: activeSuggestionItem.expense_category_id ?? null,
        }
      : null;
    const category = String(draft?.category ?? "").trim();
    const expenseCategoryId =
      draft?.expense_category_id === "" ||
      draft?.expense_category_id === null ||
      draft?.expense_category_id === undefined
        ? null
        : Number(draft.expense_category_id);
    if (!category) {
      setSuggestionDrawerError("Suggestion category is required.");
      return;
    }

    setSuggestionDrawerError("");
    setIsSuggestionDrawerSubmitting(true);
    try {
      if (isCreateMode) {
        if (!onSuggestionCreate) {
          return;
        }
        await onSuggestionCreate({
          category,
          last_amount: draft?.last_amount ?? "",
          expense_category_id: expenseCategoryId,
          selected_for_encoding: isSuggestionSelectedForEncoding(
            draft?.selected_for_encoding
          ),
        });
      } else {
        if (!originalSuggestion || !onSuggestionUpdate) {
          return;
        }
        await onSuggestionUpdate(originalSuggestion, {
          category,
          last_amount: draft?.last_amount ?? "",
          expense_category_id: expenseCategoryId,
          selected_for_encoding: isSuggestionSelectedForEncoding(
            draft?.selected_for_encoding
          ),
        });
      }
      setActiveSuggestionKey(null);
      setIsAddSuggestionDrawerOpen(false);
      resetSuggestionDraft();
    } catch (err) {
      setSuggestionDrawerError(err.message || "Failed to save suggestion.");
    } finally {
      setIsSuggestionDrawerSubmitting(false);
    }
  };

  const handleSuggestionSelectionToggle = async () => {
    if (!activeSuggestionItem || !onSuggestionUpdate) {
      return;
    }
    const category = String(
      activeSuggestionDraft?.category ?? activeSuggestionItem?.category ?? ""
    ).trim();
    const expenseCategoryId =
      activeSuggestionDraft?.expense_category_id === "" ||
      activeSuggestionDraft?.expense_category_id === null ||
      activeSuggestionDraft?.expense_category_id === undefined
        ? null
        : Number(activeSuggestionDraft.expense_category_id);
    if (!category) {
      setSuggestionDrawerError("Suggestion category is required.");
      return;
    }
    if (expenseCategoryId !== null && Number.isNaN(expenseCategoryId)) {
      setSuggestionDrawerError("Invalid expense category.");
      return;
    }

    setSuggestionDrawerError("");
    setIsSuggestionDrawerSubmitting(true);
    try {
      await onSuggestionUpdate(
        {
          category: activeSuggestionItem.category,
          expense_category_id: activeSuggestionItem.expense_category_id ?? null,
        },
        {
          category,
          last_amount:
            activeSuggestionDraft?.last_amount ??
            formatAmountInput(String(activeSuggestionItem?.last_amount ?? "")),
          expense_category_id: expenseCategoryId,
          selected_for_encoding: !activeSuggestionIsSelectedForEncoding,
        }
      );
    } catch (err) {
      setSuggestionDrawerError(
        err.message || "Failed to update suggestion selection."
      );
    } finally {
      setIsSuggestionDrawerSubmitting(false);
    }
  };

  const handleSuggestionDrawerDelete = async () => {
    if (!activeSuggestionItem || !onSuggestionDelete) {
      return;
    }
    setSuggestionDrawerError("");
    setIsSuggestionDrawerSubmitting(true);
    try {
      await onSuggestionDelete(
        activeSuggestionItem.category,
        activeSuggestionItem.expense_category_id ?? null
      );
      setActiveSuggestionKey(null);
    } catch (err) {
      setSuggestionDrawerError(err.message || "Failed to delete suggestion.");
    } finally {
      setIsSuggestionDrawerSubmitting(false);
    }
  };

  return {
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
  };
}
